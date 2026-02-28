import { Text } from '@chakra-ui/react';
import React from 'react';

import { Alert } from 'toolkit/chakra/alert';
import { Button } from 'toolkit/chakra/button';
import { apos } from 'toolkit/utils/htmlEntities';

function ChartsLoadingErrorAlert() {
  const handleRetry = React.useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <Alert status="warning" mb={ 4 } closable>
      <Text mr={ 2 }>
        { `Some charts didn${ apos }t load because the server is temporarily unavailable.` }
      </Text>
      <Button size="xs" variant="subtle" onClick={ handleRetry }>Retry</Button>
    </Alert>
  );
}

export default ChartsLoadingErrorAlert;
