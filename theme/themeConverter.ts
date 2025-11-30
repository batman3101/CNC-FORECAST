import type { ThemeConfig } from 'antd';
import muiTheme from './mui-dashboard-theme.json';

type ThemeMode = 'light' | 'dark';

/**
 * MUI Dashboard 테마 JSON을 Ant Design ThemeConfig로 변환
 */
export function convertToAntdTheme(mode: ThemeMode): ThemeConfig {
  const colors = muiTheme.colorPalette[mode];
  const typography = muiTheme.typography;
  const borderRadius = muiTheme.borderRadius;
  const components = muiTheme.components;

  return {
    token: {
      // Primary Colors
      colorPrimary: colors.primary.main,
      colorPrimaryHover: colors.primary.light,
      colorPrimaryActive: colors.primary.dark,
      colorPrimaryBg: mode === 'light' ? '#e3f2fd' : 'rgba(25, 118, 210, 0.12)',

      // Success Colors
      colorSuccess: colors.success.main,
      colorSuccessHover: colors.success.light,
      colorSuccessActive: colors.success.dark,
      colorSuccessBg: mode === 'light' ? '#edf7ed' : 'rgba(46, 125, 50, 0.12)',

      // Warning Colors
      colorWarning: colors.warning.main,
      colorWarningHover: colors.warning.light,
      colorWarningActive: colors.warning.dark,
      colorWarningBg: mode === 'light' ? '#fff4e5' : 'rgba(237, 108, 2, 0.12)',

      // Error Colors
      colorError: colors.error.main,
      colorErrorHover: colors.error.light,
      colorErrorActive: colors.error.dark,
      colorErrorBg: mode === 'light' ? '#fdeded' : 'rgba(211, 47, 47, 0.12)',

      // Info Colors
      colorInfo: colors.info.main,
      colorInfoHover: colors.info.light,
      colorInfoActive: colors.info.dark,
      colorInfoBg: mode === 'light' ? '#e5f6fd' : 'rgba(2, 136, 209, 0.12)',

      // Background Colors
      colorBgContainer: colors.background.paper,
      colorBgElevated: colors.background.paper,
      colorBgLayout: colors.background.default,
      colorBgSpotlight: colors.background.surface,

      // Text Colors
      colorText: colors.text.primary,
      colorTextSecondary: colors.text.secondary,
      colorTextTertiary: colors.text.hint,
      colorTextQuaternary: colors.text.disabled,

      // Border & Divider
      colorBorder: colors.divider,
      colorBorderSecondary: colors.divider,
      colorSplit: colors.divider,

      // Typography
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      fontSizeHeading1: 40,
      fontSizeHeading2: 32,
      fontSizeHeading3: 28,
      fontSizeHeading4: 24,
      fontSizeHeading5: 20,
      fontSizeSM: 12,
      fontSizeLG: 16,
      fontSizeXL: 20,

      // Font Weights
      fontWeightStrong: typography.fontWeightBold,

      // Border Radius
      borderRadius: borderRadius.md,
      borderRadiusSM: borderRadius.sm,
      borderRadiusLG: borderRadius.lg,
      borderRadiusXS: borderRadius.xs,

      // Spacing
      marginXS: muiTheme.spacing.values.xs,
      marginSM: muiTheme.spacing.values.sm,
      marginMD: muiTheme.spacing.values.md,
      marginLG: muiTheme.spacing.values.lg,
      marginXL: muiTheme.spacing.values.xl,
      paddingXS: muiTheme.spacing.values.xs,
      paddingSM: muiTheme.spacing.values.sm,
      paddingMD: muiTheme.spacing.values.md,
      paddingLG: muiTheme.spacing.values.lg,
      paddingXL: muiTheme.spacing.values.xl,

      // Line Heights
      lineHeight: 1.5,
      lineHeightHeading1: 1.2,
      lineHeightHeading2: 1.3,
      lineHeightHeading3: 1.4,
      lineHeightHeading4: 1.4,
      lineHeightHeading5: 1.5,

      // Shadows
      boxShadow: muiTheme.shadows.md,
      boxShadowSecondary: muiTheme.shadows.lg,

      // Motion
      motionDurationFast: `${muiTheme.transitions.duration.shorter}ms`,
      motionDurationMid: `${muiTheme.transitions.duration.standard}ms`,
      motionDurationSlow: `${muiTheme.transitions.duration.complex}ms`,
      motionEaseInOut: muiTheme.transitions.easing.easeInOut,
      motionEaseOut: muiTheme.transitions.easing.easeOut,

      // Z-Index
      zIndexPopupBase: muiTheme.zIndex.modal,

      // Control
      controlHeight: 40,
      controlHeightSM: 32,
      controlHeightLG: 48,
    },
    components: {
      Button: {
        borderRadius: components.button.borderRadius,
        controlHeight: 40,
        controlHeightSM: 32,
        controlHeightLG: 48,
        paddingInline: 16,
        paddingInlineSM: 10,
        paddingInlineLG: 22,
      },
      Card: {
        borderRadiusLG: components.card[mode].borderRadius,
        paddingLG: components.card[mode].padding,
        boxShadowTertiary: components.card[mode].shadow,
      },
      Input: {
        borderRadius: components.input.borderRadius,
        paddingBlock: 8,
        paddingInline: 14,
      },
      Select: {
        borderRadius: components.input.borderRadius,
      },
      Table: {
        headerBg: components.table[mode].headerBackground,
        rowHoverBg: components.table[mode].rowHover,
        rowSelectedBg: components.table[mode].rowSelected,
        borderColor: colors.divider,
        cellPaddingBlock: 16,
        cellPaddingInline: 16,
      },
      Menu: {
        itemBorderRadius: components.sidebar.itemBorderRadius,
        itemMarginInline: 8,
        itemPaddingInline: 16,
        subMenuItemBg: 'transparent',
      },
      Layout: {
        headerBg: components.appBar[mode].background,
        headerHeight: components.appBar.height,
        siderBg: components.sidebar[mode].background,
      },
      Tabs: {
        itemSelectedColor: components.tabs[mode].selectedText,
        inkBarColor: components.tabs[mode].indicator,
        itemColor: components.tabs[mode].text,
      },
      Alert: {
        borderRadiusLG: components.alert.borderRadius,
      },
      Modal: {
        borderRadiusLG: components.dialog.borderRadius,
        paddingContentHorizontalLG: components.dialog.padding,
      },
      Tooltip: {
        borderRadius: components.tooltip.borderRadius,
      },
      Tag: {
        borderRadiusSM: components.chip.borderRadius,
      },
      Badge: {
        textFontSize: 12,
      },
      Progress: {
        defaultColor: colors.primary.main,
      },
      Pagination: {
        itemActiveBg: components.pagination[mode].selectedBackground,
        itemActiveColorDisabled: components.pagination[mode].selectedColor,
        borderRadius: components.pagination.borderRadius,
      },
    },
  };
}

/**
 * MUI 차트 컬러 팔레트 가져오기
 */
export function getChartColors(variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'categorical' = 'categorical'): string[] {
  return muiTheme.charts.colors[variant];
}

/**
 * 대시보드 레이아웃 값 가져오기
 */
export function getDashboardLayout() {
  return muiTheme.dashboard.layout;
}

/**
 * 통계 카드 스타일 가져오기
 */
export function getStatsCardStyles(mode: ThemeMode, index: number) {
  const styles = muiTheme.dashboard.statsCard[mode];
  const colorIndex = index % styles.backgrounds.length;

  return {
    background: styles.backgrounds[colorIndex],
    iconBackground: styles.iconBackgrounds[colorIndex],
  };
}

/**
 * 원본 MUI 테마 JSON 가져오기
 */
export function getRawTheme() {
  return muiTheme;
}

/**
 * 특정 컴포넌트의 스타일 가져오기
 */
export function getComponentStyle<K extends keyof typeof muiTheme.components>(
  componentName: K,
  mode?: ThemeMode
) {
  const component = muiTheme.components[componentName];
  if (mode && typeof component === 'object' && mode in component) {
    return (component as Record<string, unknown>)[mode];
  }
  return component;
}

export default muiTheme;
