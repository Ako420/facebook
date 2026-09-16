import { cn } from "../../lib/cn"

type avatarprops= {
    url:string,
    alt_image?:string,
    size:number,
    text?:string,
    className?:string
}

export function AvatarCard({
    url,
    alt_image,
    size,
    text,
    className
}:avatarprops) {
  return (
    <>
    <div className={cn("flex p-2 m-1 flex-row items-center gap-4",className)}>
        <img className="rounded-full" src={url} 
            alt={alt_image} 
            width={size} 
            height={size}
        />
        <p>{text}</p>
    </div>
    </>
    
  )
}
