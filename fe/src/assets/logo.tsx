import { type ImgHTMLAttributes } from 'react'
import logo from './logo.png'

export function Logo({
  className,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return <img className='bg-white' src={logo} {...props} />
}
