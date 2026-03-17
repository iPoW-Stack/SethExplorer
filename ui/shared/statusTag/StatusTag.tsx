import React from 'react';

import capitalizeFirstLetter from 'lib/capitalizeFirstLetter';
import type { BadgeProps } from 'toolkit/chakra/badge';
import { Badge } from 'toolkit/chakra/badge';
import { Tooltip } from 'toolkit/chakra/tooltip';
import type { IconName } from 'ui/shared/IconSvg';
import IconSvg from 'ui/shared/IconSvg';

export type StatusTagType = 'ok' | 'error' | 'pending';

export interface Props extends BadgeProps {
  type: 'ok' | 'error' | 'pending';
  text?: string;
  errorText?: string | null;
}

const StatusTag = ({ type, text, errorText, ...rest }: Props) => {
  let icon: IconName;
  let colorPalette: BadgeProps['colorPalette'];
  let borderColor: string;
  let bgColor: string;
  let fgColor: string;

  switch (type) {
    case 'ok':
      icon = 'status/success';
      colorPalette = 'green';
      borderColor = 'rgba(0, 255, 148, 0.28)';
      bgColor = 'rgba(0, 255, 148, 0.12)';
      fgColor = '#00FF94';
      break;
    case 'error':
      icon = 'status/error';
      colorPalette = 'red';
      borderColor = 'rgba(245, 101, 101, 0.28)';
      bgColor = 'rgba(245, 101, 101, 0.12)';
      fgColor = '#FC8181';
      break;
    case 'pending':
      icon = 'status/pending';
      colorPalette = 'gray';
      borderColor = 'rgba(255, 255, 255, 0.12)';
      bgColor = 'rgba(255, 255, 255, 0.06)';
      fgColor = '#9CA3AF';
      break;
  }

  const iconElement = <IconSvg name={icon} boxSize={3.5} display={text ? 'inline-block' : 'block'} />;

  if (!text) {
    return (
      <Badge colorPalette={colorPalette} borderColor={borderColor} bg={bgColor} color={fgColor} {...rest}>
        {iconElement}
      </Badge>
    );
  }

  const capitalizedText = capitalizeFirstLetter(text);

  return (
    <Tooltip content={errorText} disabled={!errorText}>
      <Badge
        colorPalette={colorPalette}
        startElement={iconElement}
        borderColor={borderColor}
        bg={bgColor}
        color={fgColor}
        px={3}
        py={1}
        fontSize="sm"
        fontWeight={600}
        borderRadius="full"
        {...rest}
      >
        {capitalizedText}
      </Badge>
    </Tooltip>
  );
};

export default StatusTag;
