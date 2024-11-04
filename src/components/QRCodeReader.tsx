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
    getAvailableDevicesSafe(true)

    return () => {
      stop()
    }
    // eslint-disable-next-line
  }, [])

  const getAvailableDevicesSafe = async (retry: boolean) => {
    return BrowserQRCodeReader.listVideoInputDevices().then(_devices => {
      if (retry && _devices.length <= 1) {
        // retry
        setTimeout(() => {
          getAvailableDevicesSafe(false)
        }, 300)
      } else {
        setCameras(_devices)
      }
    }).catch(() => {})
  }

  /**
   * 
   * @returns the number of availableDevices
   */
  const setAvailableDevices = async (retry: boolean) => {
    if (retry) {
      return BrowserQRCodeReader.listVideoInputDevices().then(_devices => {
        setCameras(_devices)
        return _devices?.length || 0
      })
    }
  }

  const getDefaultCameraIndex = async (items: [], fallbackIndex: number): Promise<number> => {
    let _cameraIndex = items.length >= fallbackIndex ? fallbackIndex : 0 // Array length check
    _cameraIndex = items.findIndex((item: any) => item?.label?.includes(props.default))
    if (_cameraIndex === -1) {
      // Try facingMode prop
      return navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: props.default === 'front' ? 'user' : 'environment'
        }
      }).then(mediaStream => {
        let tracks = mediaStream.getTracks()
        if (tracks && tracks.length > 0) {
          let track = tracks[0]
          let defaultCameraId = track.getSettings().deviceId
          _cameraIndex = items.findIndex((item: any) => item.deviceId === defaultCameraId)
        }
        return _cameraIndex !== -1 ? _cameraIndex : fallbackIndex
      }).catch(() => {
        return fallbackIndex
      })
    } else return Promise.resolve(_cameraIndex)
  }

  // Get saved index and check
  const getFavoriteCameraIndexSafe = (arrayLength: number) => {
    let tmp = localStorage.getItem(LOCAL_STORAGE_KEY_FAVORITE_CAMERA) || 0
    try {
      tmp = +tmp
      return arrayLength > tmp ? tmp : 0
    } catch {
      return 0
    }
  }

  useEffect(() => {
    if (cameras && cameras.length > 0) {
      if (cameras.length === 1) setSelectedIndex(0)
      else {
        let favoriteCameraIndex = getFavoriteCameraIndexSafe(cameras.length)
        // Select the default one if present
        if (props.default) {
          getDefaultCameraIndex(cameras, favoriteCameraIndex).then(index => setSelectedIndex(index))
        } else {
          setSelectedIndex(favoriteCameraIndex)
        }
      }
    }
  }, [cameras])

  useEffect(() => {
    if (cameras && selectedIndex !== undefined) {
      let retry = true
      _codeReader = new BrowserMultiFormatReader(hints)

      onCameraChange().catch(() => {
        // Sometimes camera is not ready. This is a workaround to retry connnection
        if (retry) {
          retry = false
          onCameraChange()
        }
      })
      if (!props.default) localStorage.setItem(LOCAL_STORAGE_KEY_FAVORITE_CAMERA, `${selectedIndex}`)
    }
    //eslint-disable-next-line
  }, [selectedIndex])

  const onCameraChange = async () => {
    if (selectedIndex !== undefined && cameras && cameras.length > +selectedIndex) {
      const deviceId = cameras[selectedIndex].deviceId
      // if necessary rotate video
      rotateVideo()

      // Start video
      decodeVideo(deviceId)
    }
  }

  const isFlashLightAvailable = () => {
    const video = document.querySelector('video')
    if (video && video.srcObject) {
      try {
        return (video.srcObject as any).getTracks()[0].getCapabilities().torch as boolean
      } catch (e) {
        console.error(e)
        return false
      }
    }
    return false
  }

  const decodeVideo = (deviceId: string) => {
    // Start reading
    // N.B. decodeFromContraints has a lower video quality, but work on every device
    // decodeFromVideoDevice has better video quality, but on some device (ex. Poynt-P61B) doesn't work due to unsupported video codec
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
        _controlsRef.current = controls
        // Check if flashLight is available, and show action button
        setFlash(isFlashLightAvailable() === true ? false : 'unavailable')
      }).catch((e) => {
        console.log(e)
        // select the first one ???
      })
    }
  }

  const stop = () => {
    try {
      _codeReader = undefined
      if (_controlsRef.current) {
        _controlsRef.current.stop()
      }
    } catch (e) {
      console.log(e)
      // Error
    }
  }

  const changeCamera = () => {
    setIsLoading(true)
    setFlash('unavailable')
    if (_controlsRef.current) {
      stop()
      if (selectedIndex !== undefined && cameras.length > selectedIndex + 1) {
        setSelectedIndex(selectedIndex + 1)
      } else {
        setSelectedIndex(0)
      }
    }
  }

  const rotateVideo = () => {
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
  }

  const FlashlightButton = () => {

    const onButtonClick = () => {
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
          console.log(e)
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