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

  switch (type) {
    case 'ok':
      icon = 'status/success';
      colorPalette = 'green';
      borderColor = 'rgba(0, 255, 163, 0.32)';
      break;
    case 'error':
      icon = 'status/error';
      colorPalette = 'red';
      borderColor = 'rgba(245, 101, 101, 0.3)';
      break;
    case 'pending':
      icon = 'status/pending';
      colorPalette = 'gray';
      borderColor = 'rgba(255, 255, 255, 0.16)';
      break;
  }

  const iconElement = <IconSvg name={ icon } boxSize={ 2.5 } display={ text ? 'inline-block' : 'block' }/>;

  if (!text) {
    return (
      <Badge colorPalette={ colorPalette } borderColor={ borderColor } { ...rest }>
        { iconElement }
      </Badge>
    );
  }

  const capitalizedText = capitalizeFirstLetter(text);

  return (
    <Tooltip content={ errorText } disabled={ !errorText }>
      <Badge colorPalette={ colorPalette } startElement={ iconElement } borderColor={ borderColor } { ...rest }>
        { capitalizedText }
      </Badge>
    </Tooltip>
  );
};

export default StatusTag;
