import './QRCodeReader.css'
import React from 'react';
import CameraswitchRoundedIcon from '@mui/icons-material/CameraswitchRounded';
import FlashlightOnRoundedIcon from '@mui/icons-material/FlashlightOnRounded';
import FlashlightOffRoundedIcon from '@mui/icons-material/FlashlightOffRounded';
import { useState, useRef, useMemo, useEffect, MutableRefObject } from "react";
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

const actionsButtonStyle = {
  marginLeft: '.5em',
  marginRight: '.5em',
  cursor: 'pointer'
}
/**
 * Read QRCode using decodeFromConstraints
 * @param props 
 * @returns 
 */
const QRCodeReader = (props: IQRCodeReaderProps) => {
  const [cameras, setCameras]: any = useState()
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [flash, setFlash] = useState<boolean | 'unavailable'>('unavailable')
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
      console.log("Use camera " + selectedIndex + " id:" + cameras[selectedIndex].deviceId)
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
      }).catch((e) => {
        console.log(e)
        // select the first one ???
      })

      // Handle flash light
      isFlashLightAvailable().then(isAvailable => {
        console.log("flash available: " + isAvailable)
        setFlash(isAvailable ? false : 'unavailable')
      }).catch((e) => {
        console.log(e)
        setFlash('unavailable')
      })
    }
  }

  const isFlashLightAvailable = async () => {
    if ('mediaDevices' in navigator) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      });
      const flashAvailable = BrowserQRCodeReader.mediaStreamIsTorchCompatible(stream);
      return flashAvailable;
    } else {
      console.log("mediaDevices not found")
      throw 'unavailable'
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
        if (item.name === deviceModelName && item.camerasLabel.includes(cameras[selectedIndex].label)) {
          el!.style.transform = 'rotate(270deg)';
          el!.className += 'rotate-video-270'
          removeClass = false
        }
      })
      if (removeClass) el.classList.remove("rotate-video-270")
    }
  }

  const FlashlightButton = () => {
    const onButtonClick = () => {
      if (selectedIndex) {
        // cast to any because advanced constraint aren't update
        (navigator.mediaDevices as any).getUserMedia({
          video: {
            deviceId: cameras[selectedIndex].deviceId
          }
        }).then((stream: any) => {
          stream.getVideoTracks()[0].applyConstraints({
            advanced: [{
              torch: !flash
            }]
          })
          setFlash(!flash)
        }).catch((e: any) => {
          console.log(e)
        })
      }
    }

    if (flash === true) {
      return <FlashlightOffRoundedIcon fontSize='large' style={actionsButtonStyle} onClick={onButtonClick} />
    } else {
      return <FlashlightOnRoundedIcon fontSize='large' style={actionsButtonStyle} onClick={onButtonClick} />
    }
  }

  return <div className='qrcode-reader'>
    <section style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
      {isLoading ? props.loadingComponent ? props.loadingComponent : <></> : null}
      <video id="qr-reader-preview" style={{ maxWidth: '100%', ...props.style}} muted playsInline >
      </video>
      <div className='actions-icon-root' style={{
        display: 'inline-flex',
        justifyContent: 'center',
        marginTop: '1em',
      }}>
        {cameras && cameras.length > 1 ? <CameraswitchRoundedIcon fontSize='large' style={actionsButtonStyle} onClick={changeCamera} /> : null}
        {flash !== 'unavailable' ? <FlashlightButton /> : null}
      </div>
    </section>
  </div>
}

export default QRCodeReader