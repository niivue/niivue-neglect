import { Niivue } from '@niivue/niivue'
async function main() {
  async function addVolumeFromFiles(f) {
      await nv1.loadFromFile(f[0])
      nv1.setColormap(nv1.volumes[2].id, 'red')
      lesionSlider.oninput()
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
    window.alert('Outcome prediction: 0.70289')
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
    onLocationChange: handleLocationChange
  }
  maskSlider.oninput = function () {
    nv1.setOpacity(1, this.value /255)
  }
  lesionSlider.oninput = function () {
    nv1.setOpacity(2, this.value /255)
  }
  const nv1 = new Niivue(defaults)
  nv1.attachToCanvas(gl1)
  nv1.opts.dragMode = nv1.dragModes.pan
  nv1.opts.multiplanarForceRender = true
  nv1.opts.yoke3Dto2DZoom = true
  nv1.opts.crosshairGap = 11
  nv1.setInterpolation(true)
  await nv1.loadVolumes([
    { url: './betsct1_unsmooth.nii.gz' },
    {url: './mask_vox.nii.gz', colormap: "blue"},
    {url: './M2095_lesion.nii.gz', colormap: "red"},
  ])
  maskSlider.oninput()
  lesionSlider.oninput()
}

main()
