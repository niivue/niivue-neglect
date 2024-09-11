### NiiVue Neglect

Provided a lesion map the [live demo](https://niivue.github.io/niivue-neglect/) web page will predict the chronic neglect severity. The provided lesion map should be normalized to standard space. For optimal performance, acute behavioral data should include three behavioral measures: the [Center of Cancellation (CoC) letter score](https://github.com/neurolabusc/Cancel), the [Center of Cancellation (CoC) bells score](https://github.com/neurolabusc/Cancel) and a simple [Copy Task](https://psycnet.apa.org/doiLanding?doi=10.1037%2Ft28076-000). However, the software will provide an estimate with degraded accuracy without these behavioral measures. This is an edge-based solution: the values are computed directly on the web browser, and are not shared with a cloud service. 



### Usage

 1. Open the [live demo](https://niivue.github.io/niivue-neglect/).
 2. Press the `Open Lesion Map` button and select the normalized lesion. You can normalize lesions using [the clinical toolbox for SPM](https://github.com/neurolabusc/Clinical).
 3. You can visually inspect the lesion (shown as red) with respect to the grayscale atlas and the core prediction voxels (shown in blue).
 4. If known, enter the `letters CoC`: this [Center of Cancellation](https://github.com/neurolabusc/Cancel) value should be a number in the range of 0..1. If this value is unknown, make sure this field is empty.
 5. If known, enter the `bells CoC`: this [Center of Cancellation](https://github.com/neurolabusc/Cancel) value should be a number in the range of 0..1. If this value is unknown, make sure this field is empty.
 6. If known, enter the `copying score`: this [value](https://psycnet.apa.org/doiLanding?doi=10.1037%2Ft28076-000) value should be a number in the range of 0..8. If this value is unknown, make sure this field is empty. 
 7. Press the `Prediction` button to see the expected outcome score.

![niivue-neglect user interface](niivue-neglect.png)

### For Developers

You can serve a hot-reloadable web page that allows you to interactively modify the source code.

```bash
git clone https://github.com/niivue/niivue-neglect
cd niivue-neglect
npm install
npm run dev
```

### Links

These models are described by Röhrig et al.:

 - Röhrig L, Wiesen D, Li D, Karnath H-O ([2024](https://www.medrxiv.org/content/10.1101/2024.01.10.24301050v1)). Predicting individual long-term prognosis of spatial neglect based on acute stroke patient data. medRxiv 2024.01.10.24301050, https://doi.org/10.1101/2024.01.10.24301050
