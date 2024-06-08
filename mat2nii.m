function ma2nii
% convert model with Radial basis function kernels from matlab to NIfTI
% we could use JSON, but we want to retain precision


models = load('models_5x10_diff.mat').models;
%
v = 1;
nii(v) = numel(models);
v = v + 1;
for i = 1:numel(models)
    nii(v) = size(models{i}.SVs,1);
    v = v + 1;
    nii(v) = size(models{i}.SVs,2);
    v = v + 1;
    nii(v) = - models{i}.rho; % bias_i
    v = v + 1;
    nii(v) = models{i}.Parameters(4); % gamma_i
    v = v + 1;
    for j = 1:numel(models{i}.SVs)
        nii(v) = models{i}.SVs(j); % support_vectors_i
        v = v + 1;
    end
    if (size(models{i}.SVs,1) ~= numel(models{i}.sv_coef))
        error('unexpected numel sv_coef');
    end
    for j = 1:numel(models{i}.sv_coef)
        nii(v) = models{i}.sv_coef(j); % coefficients_i
        v = v + 1;
    end
end
niftiwrite(nii,'models_5x10_diff.nii')
