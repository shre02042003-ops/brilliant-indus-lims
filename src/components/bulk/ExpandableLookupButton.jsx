import React from "react";
import { Button, Box } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import MenuBookIcon from "@mui/icons-material/MenuBook";

export default function ExpandableLookupButton({ label, to }) {
  return (
    <Button
      component={RouterLink}
      to={to}
      variant="outlined"
      size="small"
      title={`Existing ${label} lookup`}
      sx={{
        minWidth: 0,
        width: 34,
        height: 34,
        p: 0,
        overflow: "hidden",
        whiteSpace: "nowrap",
        justifyContent: "flex-start",
        borderRadius: "17px",
        bgcolor: "background.paper",
        color: "text.secondary",
        borderColor: "divider",
        transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms ease, color 200ms ease",
        "&:hover": {
          width: 220,
          bgcolor: "grey.100",
          color: "text.primary",
          borderColor: "primary.main",
        },
        "&:hover .lookup-label": {
          opacity: 1,
          transform: "translateX(0)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minWidth: 34,
          height: 34,
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <MenuBookIcon fontSize="small" />
      </Box>
      <Box
        component="span"
        className="lookup-label"
        sx={{
          opacity: 0,
          transform: "translateX(-4px)",
          transition: "opacity 200ms ease 60ms, transform 200ms ease 60ms",
          fontSize: 13,
          textTransform: "none",
          pr: 1.5,
        }}
      >
        Existing {label} lookup
      </Box>
    </Button>
  );
}
