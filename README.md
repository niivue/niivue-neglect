# NiiVue brainchop

Provided a lesion map and an acute [Center of Cancellation](https://github.com/neurolabusc/Cancel) score, this web page will predict the chronic neglect severity. The provided lesion map should be normalized to standard space. This is an edge-based solution: the values are computed directly on the web browser, and are not shared with a cloud service. [Try the live demo](https://niivue.github.io/niivue-neglect/)

### To serve locally

```bash
git clone https://github.com/niivue/niivue-neglect
cd niivue-neglect
npm install
npm run dev
```
