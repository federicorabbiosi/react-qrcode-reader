import './QRCodeReader.css'
import React from 'react';
import CameraswitchRoundedIcon from '@mui/icons-material/CameraswitchRounded';
import FlashlightOnRoundedIcon from '@mui/icons-material/FlashlightOnRounded';
import FlashlightOffRoundedIcon from '@mui/icons-material/FlashlightOffRounded';
import { useState, useRef, useEffect, MutableRefObject } from "react";
import { BrowserMultiFormatReader, BrowserQRCodeReader, IScannerControls } from "@zxing/browser"
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { IQRCodeReaderProps } from './QRCodeReader.types';

/**
 * Some devices could have camera rotate, fix it rotating the video.
 * name is the deviceName we have it in sessionStorage.
 * camerasLabel is an array of String containing the label of the camera that have to be rotated
 */
const DEVICES_WITH_WRONG_CAMERA_ROTATION: any[] = [
  {
    name: "Poynt-P61B",
    camerasLabel: ["Video device 2"]
  }
]

const LOCAL_STORAGE_KEY_FAVORITE_CAMERA = "smartpos.camera_index"

/**
 * Read QRCode using decodeFromConstraints
 * @param props 
 * @returns 
 */
const QRCodeReader = (props: IQRCodeReaderProps) => {
  console.log("QRCodeReaderLog:1")
  const [cameras, setCameras] = useState<any>()
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [flash, setFlash] = useState<boolean | 'unavailable'>('unavailable')
  const deviceModelName = props.deviceModelName || sessionStorage.getItem("smartpos.device_model_name") || "nd"

  const _controlsRef: MutableRefObject<IScannerControls | null> = useRef(null);
  const hints = new Map()
  if (props.codeType && props.codeType === "barcode") {
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODABAR,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.ITF,
      BarcodeFormat.RSS_14,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.UPC_EAN_EXTENSION,
    ])
  } else {
    // default is qrcode
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX])
  }
  var _codeReader: BrowserMultiFormatReader | undefined

  useEffect(() => {
    console.log("QRCodeReaderLog:2")
    getAvailableDevicesSafe(true)

    return () => {
      console.log("QRCodeReaderLog:3")
      stop()
      console.log("QRCodeReaderLog:4")
    }
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (cameras && cameras.length > 0) {
      
  console.log("QRCodeReaderLog:5")
      if (cameras.length === 1) setSelectedIndex(0)
      else {
        let favoriteCameraIndex = getFavoriteCameraIndexSafe(cameras.length)
        console.log("QRCodeReaderLog:6")
        // Select the default one if present
        if (props.default) {
          getDefaultCameraIndex(cameras, favoriteCameraIndex).then(index => setSelectedIndex(index)).catch(e => console.log("QRCodeReader:ERR7", e))
          console.log("QRCodeReaderLog:7")
        } else {
          console.log("QRCodeReaderLog:8")
          setSelectedIndex(favoriteCameraIndex)
        }
      }
    }
  }, [cameras])

  useEffect(() => {
    if (cameras && selectedIndex !== undefined) {
      let retry = true
      _codeReader = new BrowserMultiFormatReader(hints)

      console.log("QRCodeReaderLog:9")
      onCameraChange().catch(() => {
        // Sometimes camera is not ready. This is a workaround to retry connnection
  console.log("QRCodeReaderLog:10")
        if (retry) {
          retry = false
          console.log("QRCodeReaderLog:11")
          onCameraChange()
        }
      })
      if (!props.default) localStorage.setItem(LOCAL_STORAGE_KEY_FAVORITE_CAMERA, `${selectedIndex}`)
    }
    //eslint-disable-next-line
  }, [selectedIndex])

  const getBackCameraIndexByLabel = (_devices: any) => {
    console.log("QRCodeReaderLog:12")
    // try to get the back camera
    let backCamera = _devices.findIndex((cam: any) => cam.label?.includes("back"))
    console.log("QRCodeReaderLog:13")
    return backCamera !== -1 ? backCamera : 0
  }

  const getAvailableDevicesSafe = async (retry: boolean) => {
    // On mobile phone, on the first run listVideoInputDevices() (same as navigator.mediaDevices.enumerateDevices()) return only one device.
    // A workaround to fix it is to call getUserMedia() before it. In this way all the available devices will be in the list
  console.log("QRCodeReaderLog:14")
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      console.log("QRCodeReaderLog:15")
      // stop previous track to fix the problem that some devices in the list arenìt available
      stream.getTracks().forEach(track => track.stop())

      console.log("QRCodeReaderLog:16")
      BrowserQRCodeReader.listVideoInputDevices().then(_devices => {
        console.log("QRCodeReaderLog:17")
        setCameras(_devices)
      }).catch(e => console.log("QRCodeReader:ERR6", e))
    }).catch(e => console.log("QRCodeReader:ERR4", e))
    console.log("QRCodeReaderLog:18")
  }

  const getDefaultCameraIndex = async (items: [], fallbackIndex: number): Promise<number> => {
    console.log("QRCodeReaderLog:19")
    let _backCamera = getBackCameraIndexByLabel(items)
    console.log("QRCodeReaderLog:20")
    let _cameraIndex = items.length >= fallbackIndex ? fallbackIndex : _backCamera // Array length check

    if (props.default) {
      _cameraIndex = items.findIndex((item: any) => item?.label?.includes(props.default))
    }
    if (_cameraIndex === -1) {
      // Try facingMode prop
      console.log("QRCodeReaderLog:21")
      return navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: props.default === 'front' ? 'user' : 'environment'
        }
      }).then(mediaStream => {
        console.log("QRCodeReaderLog:22")
        let tracks = mediaStream.getTracks()
        console.log("QRCodeReaderLog:23")
        if (tracks && tracks.length > 0) {
          let track = tracks[0]
          let defaultCameraId = track.getSettings().deviceId
          _cameraIndex = items.findIndex((item: any) => item.deviceId === defaultCameraId)
          console.log("QRCodeReaderLog:24")
        }
        console.log("QRCodeReaderLog:25")
        return _cameraIndex !== -1 ? _cameraIndex : fallbackIndex
      }).catch(() => {
        console.log("QRCodeReaderLog:26")
        return fallbackIndex
      })
    } else return Promise.resolve(_cameraIndex)
  }

  // Get saved index and check
  const getFavoriteCameraIndexSafe = (arrayLength: number) => {
    console.log("QRCodeReaderLog:27")
    let tmp = localStorage.getItem(LOCAL_STORAGE_KEY_FAVORITE_CAMERA) || 0
    try {
      console.log("QRCodeReaderLog:28")
      tmp = +tmp
      return arrayLength > tmp ? tmp : 0
    } catch {
      console.log("QRCodeReaderLog:29")
      return 0
    }
  }

  const onCameraChange = async () => {
    if (selectedIndex !== undefined && cameras && cameras.length > +selectedIndex) {
      const deviceId = cameras[selectedIndex].deviceId
      console.log("QRCodeReaderLog:30")
      // if necessary rotate video
      rotateVideo()

      console.log("QRCodeReaderLog:31")
      // Start video
      decodeVideo(deviceId)
      console.log("QRCodeReaderLog:32")
    }
  }

  const isFlashLightAvailable = () => {
    const video = document.querySelector('video')
    console.log("QRCodeReaderLog:33")
    if (video && video.srcObject) {
      console.log("QRCodeReaderLog:34")
      try {
        console.log("QRCodeReaderLog:35")
        return (video.srcObject as any).getTracks()[0].getCapabilities().torch as boolean
      } catch (e) {
        console.log("QRCodeReaderLog:36")
        console.log("QRCodeReader:ERR3", e)
        return false
      }
    }
    return false
  }

  const decodeVideo = (deviceId: string) => {
    // Start reading
    // N.B. decodeFromContraints has a lower video quality, but work on every device
    // decodeFromVideoDevice has better video quality, but on some device (ex. Poynt-P61B) doesn't work due to unsupported video codec
        console.log("QRCodeReaderLog:37")
    if (_codeReader) {
      _codeReader.decodeFromConstraints({
        video: {
          deviceId: deviceId,
          width: props.resolution ? props.resolution : undefined
        }
      }, 'qr-reader-preview', (result, error) => {
        setIsLoading(false)
        if (result) {
          stop()
          props.onResult(result.getText())
        }
      }).then(controls => {
        console.log("QRCodeReaderLog:38")
        _controlsRef.current = controls
        // Check if flashLight is available, and show action button
        try {
          console.log("QRCodeReaderLog:39")
          setFlash(isFlashLightAvailable() === true ? false : 'unavailable')
          console.log("QRCodeReaderLog:40")
        } catch {
          console.log("QRCodeReader:ERR1")
        }
      }).catch((e) => {
        console.log("QRCodeReader:ERR2")
        // select the first one ???
      })
      console.log("QRCodeReaderLog:41")
    }
  }

  const stop = () => {
    console.log("QRCodeReaderLog:42")
    try {
      _codeReader = undefined
      if (_controlsRef.current) {
        console.log("QRCodeReaderLog:44")
        _controlsRef.current.stop()
      }
    } catch (e) {
      console.log("QRCodeReaderLog:43")
      console.log(e)
      // Error
    }
  }

  const changeCamera = () => {
    setIsLoading(true)
    setFlash('unavailable')
    console.log("QRCodeReaderLog:45")
    if (_controlsRef.current) {
      console.log("QRCodeReaderLog:46")
      stop()
      if (selectedIndex !== undefined && cameras.length > selectedIndex + 1) {
        console.log("QRCodeReaderLog:47")
        setSelectedIndex(selectedIndex + 1)
      } else {
        console.log("QRCodeReaderLog:48")
        setSelectedIndex(0)
      }
    }
  }

  const rotateVideo = () => {
    console.log("QRCodeReaderLog:49")
    let el = document.getElementById("qr-reader-preview")
    let removeClass = true
    if (selectedIndex !== undefined && el) {
      DEVICES_WITH_WRONG_CAMERA_ROTATION.forEach(item => {
        if (item.name === deviceModelName && cameras[selectedIndex].label.includes(item.camerasLabel)) {

          // with css class
          if (el) el.className += ("rotate-video-270")

          //el!.style.transform = 'rotate(270deg)';
          //el!.className += 'rotate-video-270'
          removeClass = false
        }
      })
      if (removeClass) el.classList.remove("rotate-video-270")
    }
  
    console.log("QRCodeReaderLog:50")
  }

  const FlashlightButton = () => {

    const onButtonClick = () => {
      console.log("QRCodeReaderLog:51")
      const video = document.querySelector('video')
      if (video && video.srcObject) {
        const newFlashValue = flash === true ? false : true
        try {
          let track = (video.srcObject as any).getTracks()[0]

          track.applyConstraints({
            advanced: [{
              fillLightMode: newFlashValue ? 'flash' : 'off',
              torch: newFlashValue ? true : false,
            } as any],
          })
          setFlash(newFlashValue)
        } catch (e) {
          // Error changing torch value
          console.log("QRCodeReader:ERR5", e)
        }
      }
    }

    if (flash === true) {
      return <FlashlightOffRoundedIcon fontSize='large' onClick={onButtonClick} />
    } else {
      return <FlashlightOnRoundedIcon fontSize='large' onClick={onButtonClick} />
    }
  }

  return <div className='qrcode-reader'>
    <section style={{ ...props.style }}>
      {isLoading ? props.loadingComponent ? props.loadingComponent : <></> : null}
      <video id="qr-reader-preview" muted playsInline >
      </video>
      {props.viewFinder ? <div className='qrcode-reader-viewfinder' style={{ boxShadow: `${props.viewFinderStyle?.color || '#09b0e8'} 0px 0px 0px 3px inset` }}></div> : <></>}
    </section>
    <div className='actions-icon-root'>
      {cameras && cameras.length > 1 ? <CameraswitchRoundedIcon fontSize='large' onClick={changeCamera} /> : null}
      {flash !== 'unavailable' ? <FlashlightButton /> : null}
    </div>
  </div>
}

export default QRCodeReader