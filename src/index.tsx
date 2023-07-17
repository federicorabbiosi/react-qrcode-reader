import { render } from "react-dom"
import QRCodeReader from "./lib/QRCodeReader"
export { QRCodeReader }

const App = () => {
  return <QRCodeReader onResult={(code) => {console.log(code)}} />
}

render(<App />, document.getElementById('root'))