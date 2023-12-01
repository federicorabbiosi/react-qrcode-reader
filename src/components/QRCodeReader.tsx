import CameraswitchRoundedIcon from '@mui/icons-material/CameraswitchRounded';
import { useState, useRef, useMemo, useEffect, MutableRefObject } from "react";
import { BrowserMultiFormatReader, BrowserQRCodeReader, IScannerControls } from "@zxing/browser"
import './QRCodeReader.css'
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { IQRCodeReaderProps } from './QRCodeReader.types';
import React from 'react';

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
  const [cameras, setCameras]: any = useState()
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const deviceModelName = props.deviceModelName || sessionStorage.getItem("smartpos.device_model_name") || "nd"

  const _controlsRef: MutableRefObject<IScannerControls | null> = useRef(null);
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX])
  var _codeReader = useMemo(() => new BrowserMultiFormatReader(hints), [])

  useEffect(() => {
    // Get available input camera devices
    BrowserQRCodeReader.listVideoInputDevices().then(devices => {
      //devices.push(devices[0])
      setCameras(devices)
    })

    return () => {
      stop()
    }
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (cameras && cameras.length > 0) {
      let _cameraIndex = 0

      if (cameras.length > 1) {
        // Select favorite camera
        const favoriteCameraIndex = localStorage.getItem(LOCAL_STORAGE_KEY_FAVORITE_CAMERA) || 0
        if (cameras.length > +favoriteCameraIndex) {
          _cameraIndex = +favoriteCameraIndex
        }
      }
      setSelectedIndex(_cameraIndex)
    }
  }, [cameras])

  useEffect(() => {
    if (cameras && selectedIndex !== undefined) {
      let retry = true

      onCameraChange().catch(() => {
        // Sometimes camera is not ready. This is a workaround to retry connnection
        if (retry) {
          retry = false
          onCameraChange()
        }
      })

      localStorage.setItem(LOCAL_STORAGE_KEY_FAVORITE_CAMERA, `${selectedIndex}`)
    }
    //eslint-disable-next-line
  }, [selectedIndex])

  const onCameraChange = async () => {
    if (selectedIndex !== undefined && cameras && cameras.length > +selectedIndex) {
      // if necessary rotate video
      rotateVideo()
      // Start reading
      // N.B. decodeFromContraints has a lower video quality, but work on every device
      // decodeFromVideoDevice has better video quality, but on some device (ex. Poynt-P61B) doesn't work due to unsupported video codec
      _codeReader.decodeFromConstraints({
        video: {
          deviceId: cameras[selectedIndex].deviceId
        }
      }, 'qr-reader-preview', (result, error) => {
        setIsLoading(false)
        if (result) {
          props.onResult(result.getText())
          stop()
        }
      }).then(controls => {
        _controlsRef.current = controls
      }).catch(() => {
        // select the first one ???
      })
    }
  }

  const stop = () => {
    try {
      if (_controlsRef.current) {
        _controlsRef.current.stop()
      } else {
        /*
          setTimeout(() => {
            console.log('Stop timeout')
            if (_controlsRef.current) _controlsRef.current.stop()
          }, 1000)
        */
      }
    } catch (e) {
      // Error
    }
  }

  const changeCamera = () => {
    setIsLoading(true)
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
        if (item.name === deviceModelName && item.camerasLabel.includes(cameras[selectedIndex].label)) {
          el!.style.transform = 'rotate(270deg)';
          el!.className += 'rotate-video-270'
          removeClass = false
        }
      })
      if (removeClass) el.classList.remove("rotate-video-270")
    }
  }

  return <div className='qrcode-reader'>
    <section style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
      {isLoading ? props.loadingComponent ? props.loadingComponent : <></> : null}
      <video id="qr-reader-preview" style={{ maxWidth: '100%', ...props.style}} muted playsInline >
      </video>
      {cameras && cameras.length > 1 ? <CameraswitchRoundedIcon fontSize='large' sx={{ display: 'flex', margin: 'auto', marginTop: '1em', cursor: 'pointer' }} onClick={changeCamera} /> : null}
    </section>
  </div>
}

export default QRCodeReader