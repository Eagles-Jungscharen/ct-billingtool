import React from 'react';
import { Badge } from '@fluentui/react-components';
import type { RechnungStatus } from '../api/types';

interface Props {
  status: RechnungStatus
}

const labelMap: Record<RechnungStatus, string> = {
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  bezahlt: 'Bezahlt',
};

const colorMap: Record<RechnungStatus, 'informative' | 'warning' | 'success'> = {
  entwurf: 'informative',
  gesendet: 'warning',
  bezahlt: 'success',
};

export const InvoiceStatusBadge: React.FunctionComponent<Props> = ({ status }: Props) => {
  return (
    <Badge appearance="filled" color={colorMap[status]}>
      {labelMap[status]}
    </Badge>
  );
};
