import styleInject from 'C:/Users/feder/Documents/Works/react-qrcode-reader/node_modules/style-inject/dist/style-inject.es.js';
import React, { ReactNode, CSSProperties } from 'react';

var css_248z = ".rotate-video-270 {\n  transform: rotate(270deg);\n}\n\n.qrcode-reader {\n  display: flex;\n  flex-direction: column;\n}\n\n.qrcode-reader section {\n  position: relative;\n  width: 100%;\n  overflow: hidden;\n  display: flex;\n  justify-content: center;\n  flex-direction: column;\n}\n\n#qr-reader-preview {\n  max-width: 100%;\n}\n\n.qrcode-reader-viewfinder {\n  position: absolute;\n  height: 100%;\n  width: 100%;\n  border: '3em solid rgba(0,0,0,0.3)';\n}\n\n.actions-icon-root {\n  display: inline-flex;\n  justify-content: center;\n  margin-top: 1em\n}\n\n.actions-icon-root * {\n  margin-left: .5em;\n  margin-right: .5em;\n  cursor: pointer;\n}";
styleInject(css_248z);

interface IQRCodeReaderProps {
    onResult: (code: string) => void;
    loadingComponent?: ReactNode;
    deviceModelName?: string;
    style?: CSSProperties;
    viewFinder?: boolean;
    viewFinderStyle?: {
        color: string;
    };
}

/**
 * Read QRCode using decodeFromConstraints
 * @param props
 * @returns
 */
declare const QRCodeReader: (props: IQRCodeReaderProps) => React.JSX.Element;

export { QRCodeReader as default };
