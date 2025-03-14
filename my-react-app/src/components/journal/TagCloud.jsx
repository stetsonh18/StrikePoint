import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';

/**
 * TagCloud Component
 * Displays a collection of tags that can be selected/deselected for filtering
 */
const TagCloud = ({ tags = [], selectedTags = [], onTagSelect }) => {
  const theme = useTheme();
  
  // Generate a consistent color for each tag based on its name
  const getTagColor = (tag) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.warning.main
    ];
    
    // Use the sum of character codes to determine the color index
    const charSum = tag.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charSum % colors.length];
  };
  
  if (tags.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No tags available
      </Typography>
    );
  }
  
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag);
        const tagColor = getTagColor(tag);
        
        return (
          <Chip
            key={tag}
            label={tag}
            onClick={() => onTagSelect(tag)}
            sx={{
              backgroundColor: isSelected ? tagColor : alpha(tagColor, 0.1),
              color: isSelected ? '#fff' : tagColor,
              '&:hover': {
                backgroundColor: isSelected ? alpha(tagColor, 0.8) : alpha(tagColor, 0.2),
              },
              transition: 'background-color 0.2s, transform 0.1s',
              transform: isSelected ? 'scale(1.05)' : 'scale(1)',
              fontWeight: isSelected ? 'medium' : 'normal'
            }}
          />
        );
      })}
    </Box>
  );
};

export default TagCloud;
