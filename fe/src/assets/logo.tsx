import { type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import logo from './logo.png'

export function Logo({
  className,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return <img className={cn('bg-white', className)} src={logo} {...props} />
}
