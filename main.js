import { Niivue } from '@niivue/niivue'
async function main() {
  async function addVolumeFromFiles(f) {
      await nv1.loadFromFile(f[0])
      nv1.setColormap(nv1.volumes[2].id, 'red')
      lesionSlider.oninput()
  }
  function norm0to1(val, mn, mx) {
    // return clamped/normalized 0..1, linearly interpolated min..max
    let range = mx - mn
    let ret = (val - mn)/range
    return Math.min(Math.max(ret,0),1)
  }
  function neglect_predict() {
    if (nv1.volumes.length !== 3) {
      window.alert('Please reload the page and open lesions with the "Open Lesion Map" button')
      return
    }
    let mask = nv1.volumes[1].img
    let lesion = nv1.volumes[2].img
    let nvox = lesion.length
    if (nvox !== mask.length) {
      window.alert('Lesion must precisely match mask')
      return
    }
    let lesionVol = 0
    let nMask = 0
    const nVoxPCA = 5
    const nMaskX = Math.floor(pca_coeff.length / nVoxPCA) //expected size
    let map = new Float64Array(nvox)
    let v = 0
    for (let i = 0; i < nvox; i++) {
      if ((lesion[i] > 0) && (mask[i] > 0))
        lesionVol ++
      if (mask[i] > 1)
        map[nMask++] = lesion[i]
    }
    if (nMaskX !== nMask) {
      window.alert('PCA and mask have different number of elements')
      return
    }
    let PC = new Float64Array(nVoxPCA)
    //PC = (map'-pca_val.mu)*pca_val.coeff
    for (let i = 0; i < nMask; i++) {
      map[i] -= pca_mu[i]
    }
    for (let p = 0; p < nVoxPCA; p++) {
      const offset = p * nMask
      for (let i = 0; i < nMask; i++) {
        PC[p] += map[i]*pca_coeff[i+offset]
      }
    }
    //normalize values to range 0..1
    // -> PCs: min = -51.9073; max = 110.0535
    // -> CoC: min = -0.024243014; max = 0.951938077
    // -> ROI_vol: min = 0; max = 21.625
    for (let p = 0; p < nVoxPCA; p++) {
        PC[p] = norm0to1(PC[p], -51.9073, 110.0535)
    }
    let acuteCoC = parseFloat(cocNumber.value)
    acuteCoC = norm0to1(acuteCoC, -0.024243014, 0.951938077)
    let ROI_volML = lesionVol / 1000
    ROI_volML = norm0to1(ROI_volML, 0, 21.625)
    const input_vector = [PC[0], PC[1], PC[2], PC[3], PC[4], acuteCoC, ROI_volML]
    console.log(input_vector)
    let prediction_sum = 0
    for (let m = 0; m < models.length; m++) {
      const model = models[m]
      // Extract information from the current model
      let support_vectors_i = model.SVs
      let coefficients_i = model.sv_coef
      let bias_i = model.bias_i
      let gamma_i = model.gamma_i
      // radial basis function kernel
      function rbf_kernel(support_vectors_i, input_vector, gamma_i) {
          // Number of support vectors
          const num_support_vectors = model.dim0
          // Initialize the kernel values array
          let kernel_values_i = new Array(num_support_vectors)
          // Calculate the kernel values using nested for loops
          for (let j = 0; j < num_support_vectors; j++) {
              let sum_squares = 0
              for (let i = 0; i < input_vector.length; i++) {
                  //offset for reading 2D array as 1D vector
                  let offset = j + (i*model.dim0)
                  sum_squares += Math.pow(input_vector[i] - support_vectors_i[offset], 2)
              }
              kernel_values_i[j] = Math.exp(-gamma_i * sum_squares)
          }
          return kernel_values_i
      }
      let kernel_values_i = rbf_kernel(support_vectors_i, input_vector, gamma_i)
      // Calculate the prediction using the regression function
      let prediction = kernel_values_i.reduce((acc, kernel_value, index) => acc + coefficients_i[index] * kernel_value, 0)
      prediction += bias_i
      prediction_sum += prediction
      // Feature weights and bias term (if needed for further use)
      // let w = support_vectors_i.map((sv, index) => sv.map((value, j) => value * coefficients_i[index]))
      // let b = bias_i
    }
    let prediction_mean = prediction_sum / models.length
    return [acuteCoC , ROI_volML, prediction_mean]
  }
  openBtn.onclick = async function () {
    let input = document.createElement('input')
    input.style.display = 'none'
    input.type = 'file'
    document.body.appendChild(input)
    await nv1.removeVolume(nv1.volumes[2])
    input.onchange = async function (event) {
      await addVolumeFromFiles(event.target.files)
      
    }
    input.click()
  }
  predictBtn.onclick = function () {
    const [acuteCoC , ROI_volML, prediction] = neglect_predict()
    const str = (`Given ${ROI_volML}ml lesion, and ${acuteCoC} acute CoC, predicted recovery is ${prediction}`)
    window.alert(str)
  }
  aboutBtn.onclick = function () {
    window.alert('Drag and drop NIfTI images. Use pulldown menu to choose brainchop model')
  }
  function handleLocationChange(data) {
    document.getElementById("intensity").innerHTML = data.string
  }
  const defaults = {
    backColor: [0.4, 0.4, 0.4, 1],
    show3Dcrosshair: true,
    onLocationChange: handleLocationChange,
    dragAndDropEnabled: false,
  }
  maskSlider.oninput = function () {
    nv1.setOpacity(1, this.value /255)
  }
  lesionSlider.oninput = function () {
    nv1.setOpacity(2, this.value /255)
  }
  const nv1 = new Niivue(defaults)
  nv1.attachToCanvas(gl1)
  const pca_coeff = (await nv1.loadFromUrl('./pca_values_coeff.nii.gz')).img
  const pca_mu = (await nv1.loadFromUrl('./pca_values_mu.nii.gz')).img
  async function loadRBFmodel() {
      const rbf = (await nv1.loadFromUrl('./models_5x10_diff.nii.gz')).img
      let v = 0
      const nModels = rbf[v++]
      const fmodels = []
      for (let i = 0; i < nModels; i++) {
        let model = {}
        model.dim0 = rbf[v++]
        model.dim1 = rbf[v++]
        model.bias_i = rbf[v++]
        model.gamma_i = rbf[v++]
        model.SVs = new Float64Array(model.dim0 * model.dim1)
        for (let j = 0; j < (model.dim0 * model.dim1); j++)
          model.SVs[j] = rbf[v++]
        model.sv_coef = new Float64Array(model.dim0)
        for (let j = 0; j < model.dim0; j++)
          model.sv_coef[j] = rbf[v++]
        fmodels.push(model)
      }
      return fmodels
  }
  const models = await loadRBFmodel()
  nv1.opts.dragMode = nv1.dragModes.pan
  nv1.opts.multiplanarForceRender = true
  nv1.opts.yoke3Dto2DZoom = true
  nv1.opts.crosshairGap = 11
  nv1.setInterpolation(true)
  await nv1.loadVolumes([
    { url: './betsct1_unsmooth.nii.gz' },
    {url: './mask.nii.gz', colormap: "blue"},
    {url: './M2095_lesion.nii.gz', colormap: "red"},
  ])
  maskSlider.oninput()
  lesionSlider.oninput()
}

main()
