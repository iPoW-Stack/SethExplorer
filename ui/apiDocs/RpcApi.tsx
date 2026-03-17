import { Box, Text } from '@chakra-ui/react';
import React from 'react';

import { Link } from 'toolkit/chakra/link';

const RpcApi = () => {
  return (
    <Box>
      <Text>
        This API is provided for developers transitioning applications from Etherscan to Seth Explorer and applications requiring general API and data support.
        It supports GET and POST requests.
      </Text>
      <Link href="https://docs.apipost.net/docs/detail/5a5558709888000?target_id=3933fac5be0137" external mt={ 6 }>View modules</Link>
    </Box>
  );
};

export default React.memo(RpcApi);
