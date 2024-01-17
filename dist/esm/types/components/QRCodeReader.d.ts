import React from 'react';
import './QRCodeReader.css';
import { IQRCodeReaderProps } from './QRCodeReader.types';
/**
 * Read QRCode using decodeFromConstraints
 * @param props
 * @returns
 */
declare const QRCodeReader: (props: IQRCodeReaderProps) => React.JSX.Element;
export default QRCodeReader;
