import { AvatarCard } from "./AvatarCard"

type StatusProps={
    url:string,
    text:string,
    className?:string
}

export default function StatusCard({
    url,
    text,
    className
}:StatusProps) {
  return (
    <>
    <div clssName="relative rounded-2xl ">
        <img className="rounded-2xl  h-story-h w-story-h" src={url}  
        alt="feel-post"        
        /> 
        <p className="absolute bottom-2 left-8 text-xl font-semibold" >{text}</p>
        <AvatarCard     
            size={25}   
            url="/assets/images/cleaner2.jpeg"
            className ="absolute top-1.5 p-2 z-10 "
            />
    </div>
    </>
  )
}
