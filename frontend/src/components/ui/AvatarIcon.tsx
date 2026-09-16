import { cn } from "../../lib/cn"

type avatarprops ={
    icon:string,
    size:number,
    text?:string
    className?:string
}

export function AvatarIcon({
    icon,
    size =24,
    text,
    className
}:avatarprops) {
  return (
    <div className ={cn("flex flex-col  gap-6",className)}>
     <div>

     </div>
      <img src={icon} 
            alt="text" 
            width={size}
            height={size} 
            className="rounded-full rows-span-2"
            />
    <p>{text}</p>
    </div>
  )
}

