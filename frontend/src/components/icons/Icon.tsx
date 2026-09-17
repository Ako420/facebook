import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faFacebookF,
  faFacebookMessenger,
} from "@fortawesome/free-brands-svg-icons";
import {
  faBars,
  faBell as faBellSolid,
  faBookmark as faBookmarkSolid,
  faBriefcase,
  faCakeCandles,
  faCalendarDays,
  faCamera,
  faCaretDown,
  faCheck,
  faCheckDouble,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faCircleCheck,
  faCirclePlay,
  faClock,
  faClockRotateLeft,
  faComment as faCommentSolid,
  faEarthAmericas,
  faEllipsis,
  faEllipsisVertical,
  faFaceSmile as faFaceSmileSolid,
  faFilm,
  faFlag,
  faGamepad,
  faGear,
  faGift,
  faGrip,
  faHeart as faHeartSolid,
  faImage as faImageSolid,
  faHouse,
  faListUl,
  faLocationDot,
  faLock,
  faMagnifyingGlass,
  faMusic,
  faPaperPlane,
  faPause,
  faPen,
  faPlay,
  faPlus,
  faShare,
  faStore,
  faThumbsUp as faThumbsUpSolid,
  faTv,
  faUserGroup,
  faUserPlus,
  faUsers,
  faUserXmark,
  faVideo,
  faVolumeHigh,
  faVolumeXmark,
  faCircleInfo,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  faBell,
  faBookmark,
  faComment,
  faFaceSmile,
  faHeart,
  faImage,
  faThumbsUp,
} from "@fortawesome/free-regular-svg-icons";
import { cn } from "../../lib/cn";

const icons = {
  search: faMagnifyingGlass,
  home: faHouse,
  video: faTv,
  watch: faVideo,
  store: faStore,
  users: faUserGroup,
  "users-group": faUsers,
  gamepad: faGamepad,
  grid: faGrip,
  messenger: faFacebookMessenger,
  facebook: faFacebookF,
  bell: faBell,
  "bell-solid": faBellSolid,
  "chevron-down": faChevronDown,
  "chevron-up": faChevronUp,
  "chevron-right": faChevronRight,
  "chevron-left": faChevronLeft,
  caret: faCaretDown,
  close: faXmark,
  plus: faPlus,
  check: faCheck,
  "check-double": faCheckDouble,
  clock: faClock,
  film: faFilm,
  reels: faCirclePlay,
  bookmark: faBookmark,
  "bookmark-solid": faBookmarkSolid,
  history: faClockRotateLeft,
  settings: faGear,
  cake: faCakeCandles,
  "user-plus": faUserPlus,
  "user-x": faUserXmark,
  message: faComment,
  "message-solid": faCommentSolid,
  share: faShare,
  globe: faEarthAmericas,
  lock: faLock,
  camera: faCamera,
  "video-camera": faVideo,
  smile: faFaceSmile,
  "smile-solid": faFaceSmileSolid,
  edit: faPen,
  briefcase: faBriefcase,
  "map-pin": faLocationDot,
  calendar: faCalendarDays,
  heart: faHeart,
  "heart-solid": faHeartSolid,
  music: faMusic,
  volume: faVolumeHigh,
  "volume-off": faVolumeXmark,
  info: faCircleInfo,
  play: faPlay,
  pause: faPause,
  send: faPaperPlane,
  image: faImage,
  "image-solid": faImageSolid,
  menu: faBars,
  list: faListUl,
  flag: faFlag,
  gift: faGift,
  dots: faEllipsis,
  "dots-vertical": faEllipsisVertical,
  thumb: faThumbsUp,
  "thumb-solid": faThumbsUpSolid,
  verified: faCircleCheck,
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof icons;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <FontAwesomeIcon
      icon={icons[name]}
      style={{ fontSize: size }}
      className={cn("shrink-0", className)}
    />
  );
}

export function VerifiedBadge({ size = 13, className }: { size?: number; className?: string }) {
  return (
    <FontAwesomeIcon
      icon={faCircleCheck}
      style={{ fontSize: size }}
      className={cn("shrink-0 text-brand", className)}
    />
  );
}
