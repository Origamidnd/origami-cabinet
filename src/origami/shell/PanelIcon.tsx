import {
  ChatIcon,
  ClipboardIcon,
  GamepadIcon,
  GiftIcon,
  HomeIcon,
  InfoIcon,
  MonitorIcon,
  SubscriptionIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
  WheelIcon,
} from '@/components/icons';
import type { PanelIcon } from './panelNav';

const MAP: Record<PanelIcon, React.ComponentType<{ className?: string }>> = {
  home: HomeIcon,
  subscription: SubscriptionIcon,
  devices: MonitorIcon,
  wallet: WalletIcon,
  users: UsersIcon,
  chat: ChatIcon,
  info: InfoIcon,
  gift: GiftIcon,
  wheel: WheelIcon,
  contests: GamepadIcon,
  polls: ClipboardIcon,
  user: UserIcon,
};

export default function PanelIconView({
  name,
  className,
}: {
  name: PanelIcon;
  className?: string;
}) {
  const Icon = MAP[name];
  return <Icon className={className ?? 'h-5 w-5'} />;
}
