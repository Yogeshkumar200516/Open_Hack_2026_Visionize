import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery,
  Box,
  Slide,
  Button,
} from "@mui/material";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import HistoryIcon from "@mui/icons-material/History";
import CloseIcon from "@mui/icons-material/Close";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

const DraftSelectorDialog = ({
  open,
  onClose,
  onSelectDraft,
  onDeleteDraft,
  onClearDrafts,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const primaryColor = theme.palette.primary.main;
  const paperBg = theme.palette.background.paper;

  const [drafts, setDrafts] = useState([]);

  // ✅ Get drafts only for the logged-in user
  const fetchDrafts = () => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      setDrafts([]);
      return;
    }
    const { user_id } = JSON.parse(userData);

    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(`draft_${user_id}_`)
    );

    const loaded = keys.map((key) => {
      const parsed = JSON.parse(localStorage.getItem(key));
      return { key, ...parsed };
    });

    setDrafts(loaded);
  };

  useEffect(() => {
    if (open) {
      fetchDrafts();
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        // Prevent closing on backdrop click or escape key press
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          return;
        }
        onClose();
      }}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: isDark
            ? "linear-gradient(to right, rgb(11, 11, 11), rgb(7, 7, 7))"
            : paperBg,
          color: isDark ? "#eee" : "#333",
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${primaryColor}`,
          boxShadow: `0 0 10px ${primaryColor}`,
          maxHeight: "90vh",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          fontSize: "1.3rem",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1,
          color: isDark ? "#fff" : "#222",
        }}
      >
        <Box display="flex" alignItems="center" gap={1} sx={{ color: primaryColor }}>
          <HistoryIcon sx={{ color: primaryColor, fontWeight: "bold" }} />
          Select a Saved Draft
        </Box>
        <Tooltip title="Close">
          <IconButton onClick={onClose} sx={{ color: isDark ? "#fff" : "#444" }}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      {/* Content */}
      <DialogContent
        sx={{
          px: 2,
          pt: 1,
          overflowY: "auto",
          flex: 1,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {drafts.length === 0 ? (
          <Typography
            sx={{
              textAlign: "center",
              fontSize: "0.95rem",
              mt: 2,
              color: isDark ? "#aaa" : "#555",
            }}
          >
            No drafts available
          </Typography>
        ) : (
          <List disablePadding>
            {drafts.map((draft) => (
              <ListItem
                key={draft.key}
                button
                sx={{
                  px: 2,
                  py: 1.2,
                  borderRadius: 2,
                  mb: 1,
                  backgroundColor: isDark ? "#171717" : "#efeded",
                  "&:hover": {
                    backgroundColor: isDark ? "#333" : "#e0e0e0",
                  },
                }}
                secondaryAction={
                  <Box sx={{ display: "flex", gap: "20px" }}>
                    <Tooltip title="Edit this draft">
                      <IconButton
                        edge="end"
                        onClick={() => {
                          onSelectDraft(draft, draft.key);
                          onClose();
                        }}
                        sx={{
                          color: primaryColor,
                          border: `1px solid ${primaryColor}`,
                          "&:hover": {
                            backgroundColor: isDark
                              ? "rgba(224, 248, 251, 0.1)"
                              : "rgba(205, 243, 206, 0.1)",
                            boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                          },
                        }}
                      >
                        <DrawOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete this draft">
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          localStorage.removeItem(draft.key);
                          setDrafts((prev) =>
                            prev.filter((d) => d.key !== draft.key)
                          );
                          onDeleteDraft && onDeleteDraft(draft.key);
                        }}
                        sx={{
                          color: isDark ? "#ff7777" : "#d32f2f",
                          border: `1px solid ${isDark ? "#ff7777" : "#d32f2f"}`,
                          "&:hover": {
                            backgroundColor: isDark
                              ? "rgba(255, 77, 77, 0.1)"
                              : "rgba(211, 47, 47, 0.1)",
                            boxShadow: `0 0 8px #ef5350, 0 0 6px #df322d`,
                          },
                        }}
                      >
                        <DeleteSweepOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <Tooltip title={`Key: ${draft.key}`}>
  <ListItemText
    primary={`Draft ${draft.key.split("_").pop()} (${draft.customer?.name || "Untitled"})`}
    secondary={new Date(draft.createdAt).toLocaleString()}
    primaryTypographyProps={{
      fontSize: "1rem",
      color: isDark ? "#eee" : "#333",
      fontWeight: "bold",
    }}
  />
</Tooltip>

              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: isDark ? "1px solid #333" : "1px solid #ccc",
          justifyContent: "center",
        }}
      >
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteSweepIcon />}
          onClick={() => {
            const userData = localStorage.getItem("user");
            if (!userData) return;
            const { user_id } = JSON.parse(userData);

            Object.keys(localStorage).forEach((k) => {
              if (k.startsWith(`draft_${user_id}_`)) {
                localStorage.removeItem(k);
              }
            });
            setDrafts([]);
            onClearDrafts && onClearDrafts();
          }}
          sx={{
            textTransform: "none",
            color: "#d32f2f",
            borderRadius: "20px",
            fontWeight: "bold",
            border: "2px solid #d32f2f",
            backgroundColor: "transparent",
            transition: "all 0.3s ease-in-out",
            "&:hover": {
              borderColor: "#d32f2f",
              boxShadow: "0 0 8px #d32f2f, 0 0 6px #d32f2f",
            },
          }}
        >
          Clear All Drafts
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DraftSelectorDialog;
