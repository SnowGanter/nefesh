'use client';
// ═══════════════════════════════════════════════════════════════
//  Neo.tsx — shared neobrutalism UI components
//  Используй во всех страницах для консистентного стиля.
//  Все компоненты — inline styles (не зависят от Tailwind overrides).
// ═══════════════════════════════════════════════════════════════
import React from 'react';

// ── Цвета палитры ──
export const NEO = {
  bg: '#fef9e7',
  surface: '#ffffff',
  ink: '#000000',
  muted: '#525252',
  faint: '#a3a3a3',
  lime: '#84cc16',
  limeDark: '#65a30d',
  yellow: '#fbbf24',
  yellowDark: '#d97706',
  cyan: '#06b6d4',
  cyanDark: '#0891b2',
  pink: '#ec4899',
  pinkDark: '#db2777',
  violet: '#a855f7',
  red: '#ef4444',
  redDark: '#dc2626',
};

// ── Card ──
type CardProps = {
  children: React.ReactNode;
  bg?: string;
  fg?: string;
  flat?: boolean;       // без hover-эффекта
  hover?: boolean;      // с hover-эффектом (по умолчанию true если не flat)
  border?: string;      // цвет рамки
  shadowColor?: string; // цвет тени
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
};

export const NeoCard: React.FC<CardProps> = ({
  children, bg = NEO.surface, fg = NEO.ink,
  flat = false, hover = !flat,
  border = NEO.ink, shadowColor = NEO.ink,
  className = '', style, onClick,
}) => (
  <div
    onClick={onClick}
    className={className}
    style={{
      backgroundColor: bg,
      color: fg,
      border: `3px solid ${border}`,
      borderRadius: 0,
      boxShadow: `6px 6px 0px 0px ${shadowColor}`,
      transition: hover ? 'transform 0.1s ease, box-shadow 0.1s ease' : undefined,
      cursor: onClick ? 'pointer' : undefined,
      ...(hover ? {
        ':hover': { transform: 'translate(2px, 2px)', boxShadow: `4px 4px 0px 0px ${shadowColor}` },
      } : {}),
      ...style,
    }}
  >
    {children}
  </div>
);

// ── Button ──
type ButtonProps = {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: 'white' | 'lime' | 'yellow' | 'cyan' | 'pink' | 'black' | 'red';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
  className?: string;
  style?: React.CSSProperties;
};

const variantColors: Record<string, { bg: string; fg: string }> = {
  white:  { bg: NEO.surface, fg: NEO.ink },
  lime:   { bg: NEO.lime, fg: NEO.ink },
  yellow: { bg: NEO.yellow, fg: NEO.ink },
  cyan:   { bg: NEO.cyan, fg: NEO.ink },
  pink:   { bg: NEO.pink, fg: '#ffffff' },
  black:  { bg: NEO.ink, fg: '#ffffff' },
  red:    { bg: NEO.red, fg: '#ffffff' },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '12px' },
  md: { padding: '10px 18px', fontSize: '14px' },
  lg: { padding: '14px 24px', fontSize: '16px' },
};

export const NeoButton: React.FC<ButtonProps> = ({
  children, onClick, variant = 'white', size = 'md',
  disabled, title, type = 'button', className = '', style,
}) => {
  const v = variantColors[variant] || variantColors.white;
  const s = sizeStyles[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={className}
      style={{
        ...s,
        backgroundColor: disabled ? '#e5e5e5' : v.bg,
        color: disabled ? '#a3a3a3' : v.fg,
        border: `3px solid ${NEO.ink}`,
        borderRadius: 0,
        boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700,
        fontFamily: '"Space Grotesk", sans-serif',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translate(2px, 2px)';
        e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translate(0, 0)';
        e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${NEO.ink}`;
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translate(4px, 4px)';
        e.currentTarget.style.boxShadow = `0px 0px 0px 0px ${NEO.ink}`;
      }}
      onMouseUp={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translate(2px, 2px)';
        e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`;
      }}
    >
      {children}
    </button>
  );
};

// ── Input ──
type InputProps = {
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  autoComplete?: string;
  required?: boolean;
};

export const NeoInput: React.FC<InputProps> = ({
  value, onChange, placeholder, type = 'text', className = '', style, autoFocus, ...rest
}) => (
  <input
    {...rest}
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    autoFocus={autoFocus}
    className={className}
    style={{
      width: '100%',
      padding: '10px 14px',
      backgroundColor: NEO.surface,
      color: NEO.ink,
      border: `3px solid ${NEO.ink}`,
      borderRadius: 0,
      boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      outline: 'none',
      transition: 'transform 0.1s, box-shadow 0.1s',
      ...style,
    }}
    onFocus={(e) => {
      e.target.style.borderColor = NEO.lime;
      e.target.style.boxShadow = `4px 4px 0px 0px ${NEO.lime}`;
      e.target.style.transform = 'translate(1px, 1px)';
    }}
    onBlur={(e) => {
      e.target.style.borderColor = NEO.ink;
      e.target.style.boxShadow = `4px 4px 0px 0px ${NEO.ink}`;
      e.target.style.transform = 'translate(0, 0)';
    }}
  />
);

// ── Textarea ──
export const NeoTextarea: React.FC<{
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  style?: React.CSSProperties;
  disabled?: boolean;
}> = ({ value, onChange, placeholder, rows = 3, style, disabled }) => (
  <textarea
    disabled={disabled}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    style={{
      width: '100%',
      padding: '10px 14px',
      backgroundColor: NEO.surface,
      color: NEO.ink,
      border: `3px solid ${NEO.ink}`,
      borderRadius: 0,
      boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      outline: 'none',
      resize: 'vertical',
      transition: 'transform 0.1s, box-shadow 0.1s',
      ...style,
    }}
    onFocus={(e) => {
      e.target.style.borderColor = NEO.lime;
      e.target.style.boxShadow = `4px 4px 0px 0px ${NEO.lime}`;
      e.target.style.transform = 'translate(1px, 1px)';
    }}
    onBlur={(e) => {
      e.target.style.borderColor = NEO.ink;
      e.target.style.boxShadow = `4px 4px 0px 0px ${NEO.ink}`;
      e.target.style.transform = 'translate(0, 0)';
    }}
  />
);

// ── Select ──
export const NeoSelect: React.FC<{
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ value, onChange, className = '', style, children }) => (
  <select
    value={value}
    onChange={onChange}
    className={className}
    style={{
      width: '100%',
      padding: '10px 14px',
      backgroundColor: NEO.surface,
      color: NEO.ink,
      border: `3px solid ${NEO.ink}`,
      borderRadius: 0,
      boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 600,
      fontSize: '14px',
      cursor: 'pointer',
      outline: 'none',
      transition: 'transform 0.1s, box-shadow 0.1s',
      ...style,
    }}
    onFocus={(e) => {
      e.target.style.borderColor = NEO.lime;
      e.target.style.boxShadow = `4px 4px 0px 0px ${NEO.lime}`;
    }}
  >
    {children}
  </select>
);

// ── Badge ──
type BadgeProps = {
  children: React.ReactNode;
  bg?: string;
  fg?: string;
  style?: React.CSSProperties;
};
export const NeoBadge: React.FC<BadgeProps> = ({
  children, bg = NEO.yellow, fg = NEO.ink, style,
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      backgroundColor: bg,
      color: fg,
      border: `2px solid ${NEO.ink}`,
      borderRadius: 0,
      boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      ...style,
    }}
  >
    {children}
  </span>
);

// ── Heading ──
export const NeoHeading: React.FC<{
  children: React.ReactNode;
  level?: 1 | 2 | 3;
  highlight?: boolean;     // жёлтая подсветка под текстом
  style?: React.CSSProperties;
}> = ({ children, level = 2, highlight = false, style }) => {
  const sizes = {
    1: { fontSize: '2.5rem', lineHeight: 1.05 },
    2: { fontSize: '1.875rem', lineHeight: 1.1 },
    3: { fontSize: '1.25rem', lineHeight: 1.2 },
  };
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3';
  return (
    <Tag
      style={{
        fontFamily: '"Archivo Black", sans-serif',
        fontWeight: 900,
        letterSpacing: '-0.03em',
        color: NEO.ink,
        margin: 0,
        ...sizes[level],
        ...(highlight ? {
          background: `linear-gradient(180deg, transparent 60%, ${NEO.yellow} 60%)`,
          padding: '0 0.1em',
          display: 'inline',
        } : {}),
        ...style,
      }}
    >
      {children}
    </Tag>
  );
};

// ── Stat block (число + лейбл, цветной фон) ──
export const NeoStat: React.FC<{
  value: React.ReactNode;
  label: string;
  bg?: string;
  fg?: string;
}> = ({ value, label, bg = NEO.lime, fg = NEO.ink }) => (
  <div
    style={{
      backgroundColor: bg,
      color: fg,
      border: `3px solid ${NEO.ink}`,
      boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
      padding: '16px',
    }}
  >
    <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.75rem', lineHeight: 1 }}>{value}</div>
    <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>{label}</div>
  </div>
);

// ── Page header (иконка + заголовок + подзаголовок) ──
export const NeoPageHeader: React.FC<{
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  iconBg?: string;
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ icon: Icon, iconBg = NEO.lime, title, subtitle, actions }) => (
  <div style={{ marginBottom: '24px' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: 48, height: 48,
            backgroundColor: iconBg,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={22} strokeWidth={2.5} style={{ color: NEO.ink }} />
        </div>
        <div>
          <NeoHeading level={1} style={{ fontSize: '1.875rem' }}>{title}</NeoHeading>
          {subtitle && (
            <p style={{ marginTop: '4px', color: NEO.muted, fontSize: '14px', fontWeight: 500 }}>{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  </div>
);

// ── Empty state ──
export const NeoEmpty: React.FC<{
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  text: string;
}> = ({ icon: Icon, text }) => (
  <div
    style={{
      padding: '40px 24px',
      textAlign: 'center',
      backgroundColor: NEO.surface,
      border: `3px solid ${NEO.ink}`,
      boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
    }}
  >
    {Icon && <Icon size={32} strokeWidth={2.5} style={{ color: NEO.ink, margin: '0 auto 12px' }} />}
    <p style={{ color: NEO.muted, fontSize: '14px', fontWeight: 500 }}>{text}</p>
  </div>
);
