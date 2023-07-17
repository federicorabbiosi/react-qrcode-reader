export interface IQRCodeReaderProps {
  onResult: (code: string) => void
  deviceModelName?: string
}