'use client';
import { Property } from '@/types';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';

interface Props {
  properties: Property[];
  selectedId: string;
  onChange: (id: string) => void;
  showAll?: boolean;
}

export default function PropertySelector({ properties, selectedId, onChange, showAll }: Props) {
  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <Select
        value={selectedId}
        onChange={(e: SelectChangeEvent) => onChange(e.target.value)}
        displayEmpty
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          '& .MuiSelect-select': { display: 'flex', alignItems: 'center', gap: 1 },
        }}
      >
        {showAll && <MenuItem value="all">All Properties</MenuItem>}
        {properties.map(p => (
          <MenuItem key={p.id} value={p.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color }} />
              {p.name}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
