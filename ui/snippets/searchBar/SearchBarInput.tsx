import type { HTMLChakraProps } from '@chakra-ui/react';
import { chakra, Center } from '@chakra-ui/react';
import React from 'react';
import type { ChangeEvent, FormEvent, FocusEvent } from 'react';

import config from 'configs/app';
import useIsMobile from 'lib/hooks/useIsMobile';
import useSethStrict from 'lib/settings/useSethStrict';
import { useColorModeValue } from 'toolkit/chakra/color-mode';
import { Input } from 'toolkit/chakra/input';
import { InputGroup } from 'toolkit/chakra/input-group';
import { ClearButton } from 'toolkit/components/buttons/ClearButton';
import IconSvg from 'ui/shared/IconSvg';

const nameServicesFeature = config.features.nameServices;

interface Props extends Omit<HTMLChakraProps<'form'>, 'onChange'> {
  onChange?: (value: string) => void;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onBlur?: (event: FocusEvent<HTMLFormElement>) => void;
  onFocus?: () => void;
  onHide?: () => void;
  onClear?: () => void;
  onFormClick?: (event: React.MouseEvent<HTMLFormElement>) => void;
  isHeroBanner?: boolean;
  isSuggestOpen?: boolean;
  value?: string;
  readOnly?: boolean;
}

const SearchBarInput = (
  { onChange, onSubmit, isHeroBanner, isSuggestOpen, onFocus, onBlur, onHide, onClear, onFormClick, value, readOnly, ...rest }: Props,
  ref: React.ForwardedRef<HTMLFormElement>,
) => {
  const innerRef = React.useRef<HTMLFormElement>(null);
  React.useImperativeHandle(ref, () => innerRef.current as HTMLFormElement, []);
  const isMobile = useIsMobile();
  const isSethStrict = useSethStrict();

  const borderWidthHeroBanner = useColorModeValue(
    config.UI.homepage.heroBanner?.search?.border_width?.[0] ?? '0px',
    config.UI.homepage.heroBanner?.search?.border_width?.[1] ?? '0px',
  );

  const handleChange = React.useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.value);
  }, [ onChange ]);

  const handleKeyPress = React.useCallback((event: KeyboardEvent) => {
    if (isMobile) {
      return;
    }

    switch (event.key) {
      case '/': {
        if ([ 'INPUT', 'TEXTAREA' ].includes((event.target as HTMLElement).tagName)) {
          break;
        }

        if (!isSuggestOpen) {
          event.preventDefault();
          innerRef.current?.querySelector('input')?.focus();
          onFocus?.();
        }
        break;
      }
      case 'Escape': {
        if (isSuggestOpen) {
          innerRef.current?.querySelector('input')?.blur();
          onHide?.();
        }
        break;
      }
    }
  }, [ isMobile, isSuggestOpen, onFocus, onHide ]);

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [ handleKeyPress ]);

  const getPlaceholder = () => {
    if (isSethStrict) {
      return 'Search by Address / Txn Hash / Block / Token';
    }
    const clusterText = nameServicesFeature.isEnabled && nameServicesFeature.clusters.isEnabled ? ' / cluster ' : '';
    return `Search by address / txn hash / block / token${ clusterText }/... `;
  };

  const startElement = (
    <IconSvg
      name="search"
      boxSize={ 4 }
      mx={ 2 }
      color={ isSethStrict ? 'gray.500' : undefined }
    />
  );

  const endElement = (
    <>
      <ClearButton onClick={ onClear } visible={ Boolean(value?.length) } mx={ 2 }/>
      { !isMobile && (
        <Center
          boxSize="20px"
          mr={ 2 }
          borderRadius="sm"
          borderWidth="1px"
          borderColor={ isSethStrict ? 'rgba(107, 114, 128, 0.7)' : 'input.element' }
          color={ isSethStrict ? 'gray.500' : 'inherit' }
        >
          /
        </Center>
      ) }
    </>
  );

  return (
    <chakra.form
      ref={ innerRef }
      noValidate
      onSubmit={ onSubmit }
      onBlur={ onBlur }
      onClick={ onFormClick }
      w="100%"
      backgroundColor={{ _light: 'bg.primary', _dark: isSethStrict ? 'transparent' : 'rgba(10, 16, 20, 0.78)' }}
      borderRadius={ isSethStrict ? '8px' : 'xl' }
      borderWidth={ isSethStrict ? '0px' : '1px' }
      borderColor={{ _light: 'transparent', _dark: isSethStrict ? 'transparent' : 'rgba(255, 255, 255, 0.1)' }}
      backdropFilter={{ _dark: isSethStrict ? 'none' : 'blur(10px)' }}
      boxShadow={{ _light: 'none', _dark: isSethStrict ? 'none' : 'inset 0 0 0 1px rgba(0, 255, 163, 0.04)' }}
      position="relative"
      zIndex={ isSuggestOpen ? 'modal' : 'auto' }
      { ...rest }
    >
      <InputGroup
        startElement={ startElement }
        endElement={ endElement }
      >
        <Input
          size={{ base: isHeroBanner ? 'md' : 'sm', lg: 'md' }}
          h={ isSethStrict ? '36px' : undefined }
          placeholder={ getPlaceholder() }
          value={ value }
          onChange={ handleChange }
          onFocus={ onFocus }
          tabIndex={ readOnly ? -1 : 0 }
          borderRadius={ isSethStrict ? '8px' : undefined }
          fontSize={ isSethStrict ? '14px' : undefined }
          fontWeight={ isSethStrict ? 400 : undefined }
          lineHeight={ isSethStrict ? '20px' : undefined }
          borderWidth={ isSethStrict ? '1px' : (isHeroBanner ? borderWidthHeroBanner : '2px') }
          borderStyle="solid"
          borderColor={{ _light: 'blackAlpha.100', _dark: isSethStrict ? 'seth.border' : 'seth.border' }}
          color={{ _light: 'black', _dark: 'whiteAlpha.900' }}
          backgroundColor={{
            base: isHeroBanner ? 'input.bg' : 'dialog.bg',
            lg: 'input.bg',
            _dark: isSethStrict ? 'seth.card' : 'transparent',
          }}
          _hover={{ borderColor: isSethStrict ? 'seth.primary' : 'input.border.hover' }}
          _focusWithin={{
            _placeholder: {
              color: { _light: 'gray.300', _dark: isSethStrict ? 'gray.500' : 'rgba(0, 255, 163, 0.55)' },
            },
            borderColor: isSethStrict ? 'seth.primary' : 'input.border.focus',
            boxShadow: { _dark: isSethStrict ? '0 0 0 1px rgba(0, 255, 163, 0.45)' : '0 0 0 1px rgba(0, 255, 163, 0.26), 0 0 16px rgba(0, 255, 163, 0.12)' },
            _hover: { borderColor: isSethStrict ? 'seth.primary' : 'input.border.focus' },
          }}
          enterKeyHint="search"
        />
      </InputGroup>
    </chakra.form>
  );
};

export default React.memo(React.forwardRef(SearchBarInput));
