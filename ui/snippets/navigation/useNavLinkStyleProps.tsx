import useSethStrict from 'lib/settings/useSethStrict';

type Props = {
  isExpanded?: boolean;
  isCollapsed?: boolean;
  isActive?: boolean;
};

export default function useNavLinkStyleProps({ isExpanded, isCollapsed, isActive }: Props) {
  const isSethStrict = useSethStrict();

  return {
    itemProps: {
      variant: 'navigation' as const,
      py: isSethStrict ? 3 : '9px',
      display: 'flex',
      ...(isActive ? { 'data-selected': true } : {}),
      borderRadius: 'md',
      borderWidth: '1px',
      borderColor: 'transparent',
      transitionProperty: 'width,padding,color,border-color,background-color',
      transitionDuration: 'normal',
      transitionTimingFunction: 'ease',
    },
    textProps: {
      variant: 'inherit',
      fontSize: isSethStrict ? '14px' : '12px',
      lineHeight: isSethStrict ? '20px' : '18px',
      fontWeight: isSethStrict ? '500' : '600',
      opacity: { base: '1', lg: isExpanded ? '1' : '0', xl: isCollapsed ? '0' : '1' },
      transitionProperty: 'opacity',
      transitionDuration: 'normal',
      transitionTimingFunction: 'ease',
    },
  };
}
