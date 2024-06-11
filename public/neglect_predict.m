function neglect_predict(fnm, acuteCoC)
%Predict chronic recovery based on lesion map and acute center of
%cancellation score.
%Examples
% neglect_predict; %use GUI;
% neglect_predict('M2095_lesion.nii.gz', 0.65)
    if nargin < 1
        [p_file, p_path] = uigetfile('*.nii.gz;*.nii', 'Select lesion map');
        if p_file==0
            return
        end
        fnm = fullfile(p_path, p_file);
    end
    if nargin < 2
        prompt = {'Enter acute CoC score (-1..1):'};
        dlgtitle = 'Input';
        fieldsize = [1];
        definput = {'0.65'};
        answer = inputdlg(prompt,dlgtitle,fieldsize,definput);
        if length(answer) == 0
            return
        end
        acuteCoC = str2double(answer{1});
    end
    lesion = niftiread(fnm);
    mpath = fileparts(mfilename("fullpath"));
    fnmMsk = fullfile(mpath, 'mask.nii.gz');
    if ~exist(fnmMsk,'file')
        error('Unable to find %s', fnmMsk)
    end
    maskVox012 = uint8(niftiread(fnmMsk));
    maskROI = uint8(maskVox012 > 0);
    maskVox = uint8(maskVox012 > 1);
    ROI_volVox = nnz(maskROI & lesion);
    ROI_volML = ROI_volVox / 1000; %convert voxels to ML
    lesionVolTotalML = nnz(lesion) / 1000; %convert voxels to ML
    % fprintf("%d lesioned voxels in ROI mask: %g ml\n", ROI_volVox, ROI_volML);
    %PCA
    fnmPCA = fullfile(mpath, 'pca_values_5x21220.mat');
    if ~exist(fnmPCA,'file')
        error('Unable to find %s', fnmPCA)
    end
    pca_val = load(fnmPCA).pca_val;
    if size(pca_val.mu,2) ~= nnz(maskVox)
        error('maskVox size does not match pca_val')
    end
    map_org = double(lesion(:));
    mask_log = maskVox ~=0;
    map = map_org(mask_log);
    PC = (map'-pca_val.mu)*pca_val.coeff;
    if numel(PC) ~= 5
        error('scores_new should have 5 values')
    end
    %normalize values to range 0..1
    %       -> PCs: min = -51.9073; max = 110.0535
    %       -> CoC: min = -0.024243014; max = 0.951938077
    %       -> ROI_vol: min = 0; max = 21.625
    for i = 1:5
        PC(i) = norm0to1(PC(i), -51.9073, 110.0535);
    end
    acuteCoC01 = norm0to1(acuteCoC, -0.024243014, 0.951938077);
    ROI_volML01 = norm0to1(ROI_volML, 0, 21.625);
    % input_vector = [PC1, PC2, PC3, PC4, PC5, CoC, ROI_vol];
    % Exemplary patient data (with outcome = 0.8155):
    input_vector = [PC(1), PC(2), PC(3), PC(4), PC(5), acuteCoC01, ROI_volML01];
    fnmModel = fullfile(mpath, 'models_5x10_diff.mat');
    if ~exist(fnmPCA,'file')
        error('Unable to find %s', fnmPCA)
    end
    models = load(fnmModel).models;
    % Blank prediction-array
    predictions_mdls = zeros(numel(models),1);
    
    % For each single model (5-fold nested cross validation x 10 model repetitions)
    for i = 1:numel(models)
        % Extract information from the i-th model
        support_vectors_i = models{i}.SVs;
        coefficients_i = models{i}.sv_coef;
        bias_i = -models{i}.rho;
        % Define RBF kernel function
        gamma_i = models{i}.Parameters(4);
        rbf_kernel = @(x1, x2) exp(-gamma_i * sum((x1 - x2).^2));
        % Calculate the kernel values
        kernel_values_i = arrayfun(@(j) rbf_kernel(input_vector, support_vectors_i(j, :)), 1:size(support_vectors_i, 1));
        % Calculate the prediction using the regression function
        predictions_mdls(i) = sum(coefficients_i' .* kernel_values_i) + bias_i;
        % Feature weights and bias term
        % w = coefficients_i' * support_vectors_i; 
        % b = bias_i;
    end
    % Calculate mean prediction
    prediction_mean = mean(predictions_mdls);
    diffZ = prediction_mean * (38.72560594 + 1.211389735) - 1.211389735;
    % calculate acute z-score based on user input CoC
    acuteZ = (acuteCoC - 0.00803)/0.0216; % mean/SD of controls
    % calculate chronic z-score that can be interpreted by the user
    chronZ = acuteZ-diffZ;
    chronCoC = chronZ * 0.0216 + 0.00803;
    % output text
    % "Acute z-score = xxx; z-score difference (predicted) = xxx; chronic z-score = xxx.
    % The predicted score represents the direct improvement between acute and chronic stroke phase (i.e. acute z-score minus chronic z-score). Negative values and a z-score % of about 0 indicate no deficit; the larger the z-score, the more severe the neglect behavior."
    str = sprintf('Given %gml lesion (with %g in core neglect voxels), and acute CoC %g  (z= %g), predicted chronic CoC is %g (z= %g)\n', lesionVolTotalML, ROI_volML, acuteCoC, acuteZ, chronCoC, chronZ);
    disp(str);
end
function ret = norm0to1(val, mn, mx)
    %return normalized 0..1, linearly interpolated min..max
    range = mx - mn;
    ret = (val - mn)/range;
    ret = min(max(ret,0),1);
end

