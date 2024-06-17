import { Niivue } from '@niivue/niivue'
async function main() {
  function meanOmitNaN(values) {
    // e.g. let mn = meanOmitNaN([NaN,2, 3])
    let sum = 0
    let n = 0
    for (let i = 0; i < values.length; i++) {
    if (isNaN(values[i])) continue
      n ++
      sum += values[i]
    }
    return sum/n
  } // meanOmitNaN()
  async function addVolumeFromFiles(f) {
      await nv1.loadFromFile(f[0])
      nv1.setColormap(nv1.volumes[3].id, 'red')
      lesionSlider.oninput()
  }
  function norm0to1(val, mn, mx) {
    // return clamped/normalized 0..1, linearly interpolated min..max
    let range = mx - mn
    let ret = (val - mn)/range
    return Math.min(Math.max(ret,0),1)
  } // neglect_predict()
  function neglect_predict_noCoC() {
    if (nv1.volumes.length !== 4) {
      window.alert('Please reload the page and open lesions with the "Open Lesion Map" button')
      return
    }
    //volumes: 0=T1, 1=MaskNoCoC, 2=Mask, 3=lesion
    let mask = nv1.volumes[1].img
    let lesion = nv1.volumes[3].img
    let nvox = lesion.length
    if (nvox !== mask.length) {
      window.alert('Lesion must precisely match mask')
      return
    }
    let lesionVol = 0
    let lesionVolTotal = 0
    let nMask = 0
    const nVoxPCA = 5
    const nMaskX = Math.floor(pca_coeff_noCoC.length / nVoxPCA) //expected size
    let map = new Float64Array(nvox)
    let v = 0
    for (let i = 0; i < nvox; i++) {
      if (lesion[i] > 0)
        lesionVolTotal++
      if ((lesion[i] > 0) && (mask[i] > 0))
        lesionVol ++
      if (mask[i] > 0)
        map[nMask++] = lesion[i]
    }
    if (nMaskX !== nMask) {
      window.alert('PCA and mask have different number of elements')
      return
    }
    let PC = new Float64Array(nVoxPCA)
    console.log(pca_mu_noCoC.length)
    //PC = (map'-pca_val.mu)*pca_val.coeff
    for (let i = 0; i < nMask; i++) {
      map[i] -= pca_mu_noCoC[i]
    }
    for (let p = 0; p < nVoxPCA; p++) {
      const offset = p * nMask
      for (let i = 0; i < nMask; i++) {
        PC[p] += map[i]*pca_coeff_noCoC[i+offset]
      }
    }
    //normalize values to range 0..1
    // -> PCs: min = -203.8758; max = 353.6057
    for (let p = 0; p < nVoxPCA; p++) {
        PC[p] = norm0to1(PC[p], -203.8758, 353.6057)
    }
    console.log(PC)
    let lesionVolTotalML = lesionVolTotal / 1000
    let ROI_volML = lesionVol / 1000
    const input_vector = [PC[0], PC[1], PC[2], PC[3], PC[4]]
    // console.log(input_vector)
    let prediction_sum = 0
    for (let m = 0; m < models_noCoC.length; m++) {
      const model = models_noCoC[m]
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
    }
    const prediction_mean = prediction_sum / models.length
    const chronZ = prediction_mean * (30.1222097637568 + 1.20431863031291) - 1.20431863031291
    // calculate chronic CoC that can be interpreted by the user
    const chronCoC = chronZ * 0.0216 + 0.00803
    return [lesionVolTotalML, ROI_volML, chronCoC, chronZ]
  } // neglect_predict_noCoC()
  function meanOmitNaN(values) {
    // e.g. let mn = meanOmitNaN([NaN,2, 3])
    let sum = 0
    let n = 0
    for (let i = 0; i < values.length; i++) {
    if (isNaN(values[i])) continue
      n ++
      sum += values[i]
    }
    return sum/n
  } // meanOmitNaN()
  function neglect_predict(acuteLetters, acuteBells, acuteCopy) {
    if (nv1.volumes.length !== 4) {
      window.alert('Please reload the page and open lesions with the "Open Lesion Map" button')
      return
    }
    let acuteCoC = meanOmitNaN([acuteLetters, acuteBells])
    let acuteLettersZ = (acuteLetters - 0.00686)/0.0179 // mean/SD of controls
    let acuteBellsZ = (acuteBells - 0.0092)/0.0253 // mean/SD of controls
    let acuteCopyZ = (acuteCopy - 0.23333)/0.43018 // mean/SD of controls
    let acuteZ = meanOmitNaN([acuteLettersZ, acuteBellsZ, acuteCopyZ])
    //volumes: 0=T1, 1=MaskNoCoC, 2=Mask, 3=lesion
    let mask = nv1.volumes[2].img
    let lesion = nv1.volumes[3].img
    let nvox = lesion.length
    if (nvox !== mask.length) {
      window.alert('Lesion must precisely match mask')
      return
    }
    let lesionVol = 0
    let lesionVolTotal = 0
    let nMask = 0
    const nVoxPCA = 5
    const nMaskX = Math.floor(pca_coeff.length / nVoxPCA) //expected size
    let map = new Float64Array(nvox)
    let v = 0
    for (let i = 0; i < nvox; i++) {
      if (lesion[i] > 0)
        lesionVolTotal++
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
    let acuteCoC0_1 = norm0to1(acuteCoC, -0.024243014, 0.951938077)
    let lesionVolTotalML = lesionVolTotal / 1000
    let ROI_volML = lesionVol / 1000
    let ROI_vol0_1 = norm0to1(ROI_volML, 0, 21.625)
    const input_vector = [PC[0], PC[1], PC[2], PC[3], PC[4], acuteCoC0_1, ROI_vol0_1]
    // console.log(input_vector)
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
    }
    const prediction_mean = prediction_sum / models.length
    const diffZ = prediction_mean * (38.72560594 + 1.211389735) - 1.211389735
    const chronZ = acuteZ-diffZ
    const chronCoC = chronZ * 0.0216 + 0.00803
    return [acuteCoC, acuteZ, lesionVolTotalML, ROI_volML, chronCoC, chronZ]
  } // neglect_predict()
  openBtn.onclick = async function () {
    let input = document.createElement('input')
    input.style.display = 'none'
    input.type = 'file'
    document.body.appendChild(input)
    await nv1.removeVolume(nv1.volumes[3])
    input.onchange = async function (event) {
      await addVolumeFromFiles(event.target.files)
      
    }
    input.click()
  }
  predictBtn.onclick = function () {
    let acuteLetters = parseFloat(cocLetters.value)
    let acuteBells = parseFloat(cocBells.value)
    let acuteCopy = parseFloat(copyScore.value)
    let acuteCoCNaN = isNaN(acuteLetters) && isNaN(acuteBells)
    if (acuteCoCNaN) {
      const [lesionVolTotalML, ROI_volML, chronCoC, chronZ] = neglect_predict_noCoC()
      const str = (`Given ${lesionVolTotalML.toFixed(4)}ml lesion (with ${ROI_volML.toFixed(4)} in core neglect voxels), predicted chronic CoC is ${chronCoC.toFixed(4)} (z= ${chronZ.toFixed(4)})`)
      window.alert(str)
    } else {
      const [acuteCoC, acuteZ, lesionVolTotalML, ROI_volML, chronCoC, chronZ] = neglect_predict(acuteLetters, acuteBells, acuteCopy)
      const str = (`Given ${lesionVolTotalML.toFixed(4)}ml lesion (with ${ROI_volML.toFixed(4)} in core neglect voxels), and acute CoC ${acuteCoC.toFixed(2)}  (z= ${acuteZ.toFixed(4)}), predicted chronic CoC is ${chronCoC.toFixed(4)} (z= ${chronZ.toFixed(4)})`)
      window.alert(str)
    } 
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
    nv1.setOpacity(1, 0.1 * this.value /255)
    nv1.setOpacity(2, this.value /255)
  }
  lesionSlider.oninput = function () {
    nv1.setOpacity(3, this.value /255)
  }
  const nv1 = new Niivue(defaults)
  nv1.attachToCanvas(gl1)
  const pca_coeff = (await nv1.loadFromUrl('./pca_values_coeff.nii.gz')).img
  const pca_mu = (await nv1.loadFromUrl('./pca_values_mu.nii.gz')).img
  async function loadRBFmodel(fnm) {
      const rbf = (await nv1.loadFromUrl(fnm)).img
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
  const models = await loadRBFmodel('./models_5x10_diff.nii.gz')
  const pca_coeff_noCoC = (await nv1.loadFromUrl('./pca_noCoC_coeff.nii.gz')).img
  const pca_mu_noCoC = (await nv1.loadFromUrl('./pca_noCoC_mu.nii.gz')).img
  const models_noCoC = await loadRBFmodel('./models_noCoC.nii.gz')
  nv1.opts.dragMode = nv1.dragModes.pan
  nv1.setRenderAzimuthElevation(245, 15)
  nv1.opts.multiplanarForceRender = true
  nv1.opts.yoke3Dto2DZoom = true
  nv1.opts.crosshairGap = 11
  nv1.setInterpolation(true)
  await nv1.loadVolumes([
    { url: './betsct1_unsmooth.nii.gz' },
    {url: './mask_noCoC.nii.gz', colormap: "green"},
    {url: './mask.nii.gz', colormap: "blue"},
    {url: './example_lesion.nii.gz', colormap: "red"},
  ])
  maskSlider.oninput()
  lesionSlider.oninput()
}

main()
