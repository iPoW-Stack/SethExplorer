import { Box, Text } from '@chakra-ui/react';
import React from 'react';

import { Link } from 'toolkit/chakra/link';

const EthRpcApi = () => {
  return (
    <Box>
      <Text>
        In addition to the custom RPC endpoints documented here,
        the Seth Explorer ETH RPC API supports 3 methods in the exact format specified for Ethereum nodes,
        see the Ethereum JSON-RPC Specification for more details.
      </Text>
      <Link href="https://docs.apipost.net/docs/detail/5a5558709888000?target_id=3933fac5be0137" external mt={ 6 }>View examples</Link>
    </Box>
  );
};

export default React.memo(EthRpcApi);
