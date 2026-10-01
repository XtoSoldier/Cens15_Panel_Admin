/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

// Material Dashboard 2 React base styles
import colors from "assets/theme/base/colors";

// Material Dashboard 2 React helper functions
import pxToRem from "assets/theme/functions/pxToRem";

const { transparent, grey } = colors;

const select = {
  styleOverrides: {
    select: {
      display: "flex",
      alignItems: "center",
      boxSizing: "border-box",
      minHeight: `${pxToRem(48)} !important`,
      padding: `${pxToRem(12)} ${pxToRem(40)} ${pxToRem(12)} ${pxToRem(12)} !important`,

      "&.MuiInputBase-inputSizeSmall": {
        minHeight: `${pxToRem(40)} !important`,
        padding: `${pxToRem(10)} ${pxToRem(36)} ${pxToRem(10)} ${pxToRem(10)} !important`,
      },

      "& .Mui-selected": {
        backgroundColor: transparent.main,
      },
    },

    selectMenu: {
      background: "none",
      overflow: "unset",
    },

    icon: {
      display: "block",
      right: pxToRem(12),
      color: grey[600],
    },
  },
};

export default select;
