'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Download, FileJson, Pencil, Plus, RefreshCw, Save, Trash2, Upload, X, Check, Database, ImageIcon, Maximize2, } from 'lucide-react';
import { COLLECTIONS, dataStore } from '@/lib/dataStore';
import { useParams, useNavigate } from '@/lib/router';
import { SPELL_ELEMENTS, SPELL_RANKS, DEFAULT_SPELL_FORMULAS } from '@/data/gameData';
import { setIcon, getIcon, deleteIcon, iconKey } from '@/lib/iconStore';
import { NeoButton, NeoInput, NeoTextarea, NeoPageHeader, NeoEmpty, NEO, } from '@/components/Neo';
/* ════════════════ Toast ════════════════ */
const Toast = ({ message, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
    return (<div style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 50,
            backgroundColor: NEO.lime, color: NEO.ink,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: '12px',
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
        }}>
      <Check size={18} strokeWidth={3}/>
      <span style={{ fontSize: '14px' }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '8px', display: 'flex' }} title="Закрыть">
        <X size={16} strokeWidth={3} style={{ color: NEO.ink }}/>
      </button>
    </div>);
};
/* ════════════════ Confirm dialog ════════════════ */
const Confirm = ({ title, message, onConfirm, onCancel }) => (<div onClick={onCancel} style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
    <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: '440px',
        backgroundColor: NEO.surface,
        border: `4px solid ${NEO.ink}`,
        boxShadow: `8px 8px 0px 0px ${NEO.red}`,
        padding: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{
        width: 40, height: 40,
        backgroundColor: NEO.red,
        border: `3px solid ${NEO.ink}`,
        boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    }}>
          <AlertTriangle size={20} strokeWidth={2.5} style={{ color: '#fff' }}/>
        </div>
        <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.25rem', color: NEO.ink, margin: 0 }}>{title}</h3>
      </div>
      <p style={{ marginBottom: '24px', fontSize: '14px', lineHeight: 1.5, color: NEO.muted, fontWeight: 500 }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <NeoButton variant="white" onClick={onCancel}>Отмена</NeoButton>
        <NeoButton variant="red" onClick={onConfirm}>
          <Trash2 size={14} strokeWidth={3}/> Удалить
        </NeoButton>
      </div>
    </div>
  </div>);
/* ════════════════ FormulaHelper — панель с копируемыми переменными ════════════════ */
const FORMULA_VARS = [
    { v: 'M', d: 'маг. урон' },
    { v: 'P', d: 'физ. урон' },
    { v: 'str', d: 'сила' },
    { v: 'agi', d: 'ловкость' },
    { v: 'int', d: 'интеллект' },
    { v: 'topStat', d: 'наибольшая хар-ка' },
    { v: '{topStatName}', d: 'название наибольшей', text: true },
    { v: 'armor', d: 'броня' },
    { v: 'speed', d: 'скор. заклинаний' },
    { v: 'mastery', d: 'мастерство' },
    { v: 'crit', d: 'шанс крит.' },
    { v: 'critDmg', d: 'крит. урон' },
    { v: 'hp', d: 'текущее здоровье' },
    { v: 'maxHp', d: 'макс. здоровье' },
    { v: 'hpRegen', d: 'восст. здоровья' },
    { v: 'mp', d: 'мана' },
    { v: 'mpRegen', d: 'восст. маны' },
    { v: 'stamina', d: 'выносливость' },
    { v: 'staminaRegen', d: 'восст. выносливости' },
    { v: 'energyRegen', d: 'восст. энергии' },
    { v: 'moveSpeed', d: 'скор. передвижения' },
    { v: 'magicResist', d: 'сопр. магии' },
    { v: 'physVamp', d: 'вамп. физ.' },
    { v: 'magicVamp', d: 'вамп. маг.' },
    { v: 'manaPool', d: 'манапул' },
    { v: 'cooldown', d: 'перезарядка' },
    { v: 'spellRadius', d: 'радиус заклинаний' },
];
const FormulaHelper = ({ compact }) => {
    const [copied, setCopied] = useState(null);
    const handleCopy = (text) => {
        const fullText = text.startsWith('{') ? text : `{${text}}`;
        if (navigator.clipboard)
            navigator.clipboard.writeText(fullText);
        else {
            const ta = document.createElement('textarea');
            ta.value = fullText;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopied(text);
        setTimeout(() => setCopied(null), 1200);
    };
    return (<div style={{ padding: compact ? '8px 10px' : '10px 12px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, fontSize: '11px' }}>
      <div style={{ fontWeight: 800, marginBottom: '6px', color: NEO.ink, fontFamily: '"Archivo Black", sans-serif', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Формулы — клик чтобы скопировать:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
        {FORMULA_VARS.map(item => (<button key={item.v} onClick={() => handleCopy(item.v)} title={`${item.v} = ${item.d}`} style={{
                padding: '2px 6px', fontSize: '10px', fontWeight: 700,
                backgroundColor: copied === item.v ? NEO.lime : NEO.surface,
                color: NEO.ink, border: `1px solid ${NEO.ink}`, cursor: 'pointer',
                fontFamily: 'monospace', transition: 'background 0.15s',
            }}>
            {item.v}
          </button>))}
      </div>
      {copied && <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: 700, color: NEO.limeDark }}>✓ Скопировано: {copied.startsWith('{') ? copied : `{${copied}}`}</div>}
      <div style={{ marginTop: '4px', fontSize: '9px', color: NEO.muted }}>Переменные копируются в {`{}`}. Пример: {`{M*0,12}`} = маг. урон × 0.12</div>
    </div>);
};
/* ════════════════ Bulk editor (массовое редактирование) ════════════════ */
// Редактирует выбранные строки. Логика полей:
//   - пустое = "не изменять"
//   - значение = "установить это"
//   - маркер __CLEAR__ = "очистить" (установить пустое значение)
const CLEAR_MARKER = '__CLEAR__';
const BulkEditor = ({ rows, fields, onSave, onCancel }) => {
    const [draft, setDraft] = useState({});
    const setField = (key, val) => setDraft((prev) => ({ ...prev, [key]: val }));
    const toggleClear = (key) => setDraft((prev) => {
        const next = { ...prev };
        if (next[key] === CLEAR_MARKER)
            delete next[key];
        else
            next[key] = CLEAR_MARKER;
        return next;
    });
    const isCleared = (key) => draft[key] === CLEAR_MARKER;
    // Красная кнопка "del" — помечает поле для очистки
    const DelBtn = ({ fieldKey }) => (<button type="button" onClick={() => toggleClear(fieldKey)} title={isCleared(fieldKey) ? 'Отменить очистку' : 'Очистить у всех выбранных'} style={{
            flexShrink: 0, width: 36, height: 36,
            backgroundColor: isCleared(fieldKey) ? NEO.ink : NEO.red,
            color: isCleared(fieldKey) ? NEO.yellow : '#fff',
            border: `2px solid ${NEO.ink}`,
            boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
            fontFamily: '"Archivo Black", sans-serif', fontSize: '11px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.1s, box-shadow 0.1s',
        }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(1px,1px)'; e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${NEO.ink}`; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`; }}>
      DEL
    </button>);
    return (<div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', width: '100%', maxWidth: '640px', overflowY: 'auto', backgroundColor: NEO.surface, border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`, padding: '24px', margin: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.5rem', color: NEO.ink, margin: 0 }}>
              Массовое редактирование
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: NEO.muted }}>
              Выбрано записей: {rows.length}. Пустое поле = не изменять. Кнопка <span style={{ color: NEO.red, fontWeight: 800 }}>DEL</span> = очистить у всех.
            </p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }} title="Закрыть">
            <X size={20} strokeWidth={3} style={{ color: NEO.ink }}/>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {fields.filter(f => f.key !== 'id').map((f) => {
            const cleared = isCleared(f.key);
            return (<div key={f.key}>
                <label style={{ display: 'block', marginBottom: '6px', fontFamily: '"Space Grotesk", sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted }}>
                  {f.label}
                  {cleared && <span style={{ marginLeft: 8, padding: '1px 6px', fontSize: 9, fontWeight: 800, backgroundColor: NEO.red, color: '#fff', border: `1px solid ${NEO.ink}` }}>БУДЕТ ОЧИЩЕНО</span>}
                </label>
                {f.type === 'image' ? (<div style={{ fontSize: '11px', fontWeight: 600, color: NEO.muted, padding: '8px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}>
                    Иконки редактируются по одной в обычном редакторе
                  </div>) : (<div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {f.type === 'textarea' ? (<NeoTextarea value={cleared ? '' : (draft[f.key] || '')} onChange={(e) => setField(f.key, e.target.value)} rows={3} disabled={cleared} placeholder={cleared ? 'Поле будет очищено' : 'Оставьте пустым — не изменится'} style={{ fontFamily: '"Space Grotesk", monospace', fontSize: '13px', opacity: cleared ? 0.4 : 1 }}/>) : f.type === 'number' ? (<NeoInput type="number" value={cleared ? '' : (draft[f.key] || '')} onChange={(e) => setField(f.key, e.target.value)} disabled={cleared} placeholder={cleared ? 'Поле будет очищено (0)' : 'Оставьте пустым — не изменится'} style={{ opacity: cleared ? 0.4 : 1 }}/>) : f.type === 'boolean' ? (<button type="button" disabled={cleared} onClick={() => setField(f.key, draft[f.key] === true ? false : true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 16px', backgroundColor: cleared ? NEO.bg : (draft[f.key] === true ? NEO.lime : (draft[f.key] === false ? NEO.red : NEO.surface)), color: NEO.ink, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '13px', cursor: cleared ? 'not-allowed' : 'pointer', opacity: cleared ? 0.4 : 1 }}>
                          {cleared ? 'Очищено' : (draft[f.key] === true ? 'Да' : draft[f.key] === false ? 'Нет' : 'Не менять (нажмите для выбора)')}
                        </button>) : (<NeoInput value={cleared ? '' : (draft[f.key] || '')} onChange={(e) => setField(f.key, e.target.value)} disabled={cleared} placeholder={cleared ? 'Поле будет очищено' : 'Оставьте пустым — не изменится'} style={{ opacity: cleared ? 0.4 : 1 }}/>)}
                    </div>
                    <DelBtn fieldKey={f.key}/>
                  </div>)}
              </div>);
        })}
        </div>
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <NeoButton variant="white" onClick={onCancel}>Отмена</NeoButton>
          <NeoButton variant="lime" onClick={() => onSave(draft)}>
            <Save size={16} strokeWidth={3}/> Применить к {rows.length} записям
          </NeoButton>
        </div>
      </div>
    </div>);
};
/* ════════════════ Row editor (modal) ════════════════ */
// Поле загрузки иконки — сохраняет в IndexedDB (без лимита localStorage).
// value — это маркер 'indexeddb:KEY' (если иконка есть) или '' (если нет).
// Реальный dataURL хранится в IndexedDB по ключу key.
const ImageFieldEditor = ({ value, onChange, label, iconKey: iKey }) => {
    const inputRef = useRef(null);
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const [preview, setPreview] = useState(null); // dataURL для превью
    // Загрузить существующую иконку из IndexedDB при монтировании
    useEffect(() => {
        let active = true;
        if (value && iKey) {
            getIcon(iKey).then((url) => { if (active && url)
                setPreview(url); }).catch(() => { });
        }
        else {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear the previous image when its external source is removed.
            setPreview(null);
        }
        return () => { active = false; };
    }, [value, iKey]);
    // Сжатие через canvas: максимум 128×128, JPEG 0.85 (или PNG для прозрачности)
    const compressImage = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const MAX = 128;
                let { width, height } = img;
                if (width > height) {
                    if (width > MAX) {
                        height = Math.round(height * MAX / width);
                        width = MAX;
                    }
                }
                else {
                    if (height > MAX) {
                        width = Math.round(width * MAX / height);
                        height = MAX;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                const hasAlpha = file.type === 'image/png';
                resolve(hasAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
            img.src = String(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setErr('');
        setBusy(true);
        try {
            if (!file.type.startsWith('image/')) {
                setErr('Выберите изображение');
                e.target.value = '';
                return;
            }
            if (file.size > 3 * 1024 * 1024) {
                setErr('Максимум 3 MB');
                e.target.value = '';
                return;
            }
            const dataUrl = await compressImage(file);
            if (!iKey) {
                setErr('Сначала сохраните запись, чтобы получить ID');
                return;
            }
            await setIcon(iKey, dataUrl); // Сохраняем в IndexedDB (без лимита)
            setPreview(dataUrl);
            onChange(`indexeddb:${iKey}`); // Маркер для dataStore
        }
        catch {
            setErr('Ошибка обработки изображения');
        }
        finally {
            setBusy(false);
            e.target.value = '';
        }
    };
    const handleDelete = async () => {
        if (iKey) {
            await deleteIcon(iKey);
        }
        setPreview(null);
        onChange('');
        setErr('');
    };
    return (<div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
      <div style={{ width: 64, height: 64, flexShrink: 0, backgroundColor: NEO.bg, border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {preview ? <img src={preview} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }}/> : <ImageIcon size={26} strokeWidth={2.5} style={{ color: NEO.muted }}/>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }}/>
          <NeoButton variant="lime" size="sm" onClick={() => inputRef.current?.click()} disabled={busy || !iKey}>
            <Upload size={13} strokeWidth={3}/> {busy ? 'Обработка...' : preview ? 'Заменить' : 'Загрузить'}
          </NeoButton>
          {preview && <NeoButton variant="red" size="sm" onClick={handleDelete}><Trash2 size={13} strokeWidth={3}/> Удалить</NeoButton>}
        </div>
        {err && <span style={{ fontSize: '11px', fontWeight: 700, color: NEO.red }}>{err}</span>}
        {!err && !iKey && <span style={{ fontSize: '10px', fontWeight: 600, color: NEO.red }}>Сначала сохраните запись для получения ID</span>}
        {!err && iKey && preview && <span style={{ fontSize: '10px', fontWeight: 600, color: NEO.muted }}>Иконка сохранена (IndexedDB, без лимита)</span>}
        {!err && iKey && !preview && <span style={{ fontSize: '10px', fontWeight: 600, color: NEO.muted }}>PNG/JPG до 3 MB</span>}
      </div>
    </div>);
};
const RowEditor = ({ row, fields, onSave, onCancel, isNew, activeColl }) => {
    const [draft, setDraft] = useState(() => {
        const d = {};
        fields.forEach((f) => {
            if (f.type === 'array')
                d[f.key] = row?.[f.key] ?? [];
            else if (f.type === 'number')
                d[f.key] = row?.[f.key] ?? 0;
            else if (f.type === 'boolean')
                d[f.key] = row?.[f.key] ?? false;
            else
                d[f.key] = row?.[f.key] ?? '';
        });
        return d;
    });
    const [jsonEditField, setJsonEditField] = useState(null); // { key, label } — открывает большую модалку для этого поля
    const setField = (key, val) => setDraft((prev) => ({ ...prev, [key]: val }));
    return (<div onClick={onCancel} style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
      <div onClick={(e) => e.stopPropagation()} style={{
            maxHeight: '85vh', width: '100%', maxWidth: '640px',
            overflowY: 'auto',
            backgroundColor: NEO.surface,
            border: `4px solid ${NEO.ink}`,
            boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
            padding: '24px',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.5rem', color: NEO.ink, margin: 0 }}>
            {isNew ? 'Новая запись' : 'Редактирование записи'}
          </h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }} title="Закрыть">
            <X size={20} strokeWidth={3} style={{ color: NEO.ink }}/>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {fields.map((f) => (<div key={f.key}>
              <label style={{
                display: 'block', marginBottom: '6px',
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: '11px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: NEO.muted,
            }}>
                {f.label}
              </label>
              {f.type === 'textarea' ? (<>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <NeoTextarea value={typeof draft[f.key] === 'object' ? JSON.stringify(draft[f.key], null, 2) : draft[f.key]} onChange={(e) => setField(f.key, e.target.value)} rows={5} style={{ fontFamily: '"Space Grotesk", monospace', fontSize: '13px', flex: 1 }}/>
                    <NeoButton variant="cyan" size="sm" onClick={() => setJsonEditField({ key: f.key, label: f.label })} title="Открыть в большом редакторе">
                      <Maximize2 size={14} strokeWidth={3}/>
                    </NeoButton>
                  </div>
                  {f.key === 'desc' && (<div style={{ marginTop: '6px', padding: '8px 10px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, fontSize: '10px', lineHeight: 1.6, color: NEO.muted }}>
                      <strong style={{ color: NEO.ink, fontFamily: '"Archivo Black", sans-serif' }}>Формулы в описании:</strong> Используйте <span style={{ fontFamily: 'monospace', color: NEO.limeDark }}>{`{выражение}`}</span> для подстановки значений из характеристик персонажа.
                      <br />Пример: <span style={{ fontFamily: 'monospace', color: NEO.ink }}>Урон {`{M*0,12}`} за удар, шанс крита {`{crit}`}%</span>
                      <br />Переменные: <span style={{ fontFamily: 'monospace', color: NEO.ink }}>M</span> (маг.урон), <span style={{ fontFamily: 'monospace', color: NEO.ink }}>P</span> (физ.урон), <span style={{ fontFamily: 'monospace', color: NEO.ink }}>str, agi, int, crit, critDmg, mastery, hp, maxHp, mp, armor, speed, spellRadius</span>
                      <br /><span style={{ fontFamily: 'monospace', color: NEO.red }}>topStat</span> = значение наибольшей характеристики · <span style={{ fontFamily: 'monospace', color: NEO.red }}>{'{topStatName}'}</span> = её название (Сила/Ловкость/Интеллект)
                      <br />Запятая для дробей: <span style={{ fontFamily: 'monospace', color: NEO.ink }}>0,12</span> → 0.12
                    </div>)}
                </>) : f.type === 'number' ? (<NeoInput type="number" value={draft[f.key]} onChange={(e) => setField(f.key, Number(e.target.value))}/>) : f.type === 'boolean' ? (<button type="button" onClick={() => setField(f.key, !draft[f.key])} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '10px',
                    padding: '10px 16px',
                    backgroundColor: draft[f.key] ? NEO.lime : NEO.surface,
                    color: NEO.ink,
                    border: `3px solid ${NEO.ink}`,
                    boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 700, fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${NEO.ink}`; }}>
                  <span style={{
                    width: 18, height: 18, flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: draft[f.key] ? NEO.ink : NEO.bg,
                    border: `2px solid ${NEO.ink}`,
                    color: NEO.lime,
                }}>
                    {draft[f.key] && <Check size={12} strokeWidth={4}/>}
                  </span>
                  {draft[f.key] ? 'Да' : 'Нет'}
                </button>) : f.type === 'image' ? (<ImageFieldEditor value={draft[f.key]} onChange={(v) => setField(f.key, v)} label={f.label} iconKey={activeColl && draft.id != null ? iconKey(activeColl, draft.id) : null}/>) : (<NeoInput value={draft[f.key]} onChange={(e) => setField(f.key, e.target.value)}/>)}
            </div>))}
        </div>
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <NeoButton variant="white" onClick={onCancel}>Отмена</NeoButton>
          <NeoButton variant="lime" onClick={() => onSave(draft)}>
            <Save size={16} strokeWidth={3}/> Сохранить
          </NeoButton>
        </div>
      </div>

      {/* JSON-редактор для отдельного поля — большая модалка */}
      {jsonEditField && typeof document !== 'undefined' && createPortal(<div onClick={() => setJsonEditField(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '1200px', backgroundColor: NEO.surface, border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`, padding: '24px', maxHeight: '92vh', overflowY: 'auto', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 500 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: '"Archivo Black", sans-serif', fontSize: '1.5rem', color: NEO.ink, margin: 0 }}>
                  <span style={{ width: 32, height: 32, backgroundColor: NEO.cyan, border: `3px solid ${NEO.ink}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileJson size={18} strokeWidth={2.5} style={{ color: NEO.ink }}/>
                  </span>
                  Редактор: {jsonEditField.label}
                </h3>
                <button onClick={() => setJsonEditField(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }} title="Закрыть">
                  <X size={20} strokeWidth={3} style={{ color: NEO.ink }}/>
                </button>
              </div>
              <NeoTextarea value={typeof draft[jsonEditField.key] === 'object' ? JSON.stringify(draft[jsonEditField.key], null, 2) : (draft[jsonEditField.key] || '')} onChange={(e) => setField(jsonEditField.key, e.target.value)} rows={24} style={{ fontFamily: 'monospace', fontSize: '13px', width: '100%' }}/>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <NeoButton variant="lime" onClick={() => setJsonEditField(null)}>
                  <Check size={16} strokeWidth={3}/> Готово
                </NeoButton>
              </div>
            </div>
            <div style={{ width: 280, flexShrink: 0 }}>
              <FormulaHelper />
            </div>
          </div>
        </div>, document.body)}
    </div>);
};
/* ════════════════ Field configs per collection ════════════════ */
const FIELD_CONFIGS = {
    MOCK_NEWS: [
        { key: 'id', label: 'ID', type: 'string' },
        { key: 'title', label: 'Заголовок', type: 'string' },
        { key: 'date', label: 'Дата', type: 'string' },
        { key: 'tag', label: 'Тег', type: 'string' },
        { key: 'excerpt', label: 'Текст', type: 'textarea' },
    ],
    INITIAL_AUCTION: [
        { key: 'id', label: 'ID', type: 'string' },
        { key: 'name', label: 'Название', type: 'string' },
        { key: 'type', label: 'Тип', type: 'string' },
        { key: 'rarity', label: 'Редкость', type: 'string' },
        { key: 'seller', label: 'Продавец', type: 'string' },
        { key: 'time', label: 'Осталось', type: 'string' },
        { key: 'bid', label: 'Ставка', type: 'number' },
        { key: 'buyout', label: 'Выкуп', type: 'number' },
    ],
    DB_ITEMS: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'name', label: 'Название', type: 'string' },
        { key: 'icon', label: 'Иконка', type: 'image' },
        { key: 'type', label: 'Тип', type: 'string' },
        { key: 'rarity', label: 'Редкость', type: 'string' },
        { key: 'recipe', label: 'Крафт (рецепт)', type: 'string' },
        { key: 'desc', label: 'Описание', type: 'textarea' },
        { key: 'stats', label: 'Статы (JSON)', type: 'textarea' },
    ],
    DB_REGULAR_ITEMS: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'name', label: 'Название', type: 'string' },
        { key: 'icon', label: 'Иконка', type: 'image' },
        { key: 'type', label: 'Тип', type: 'string' },
        { key: 'recipe', label: 'Крафт (рецепт)', type: 'string' },
        { key: 'desc', label: 'Описание', type: 'textarea' },
        { key: 'stats', label: 'Статы (JSON)', type: 'textarea' },
    ],
    DB_CHARMS: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'name', label: 'Название', type: 'string' },
        { key: 'icon', label: 'Иконка', type: 'image' },
        { key: 'desc', label: 'Описание', type: 'textarea' },
        { key: 'stats', label: 'Статы (JSON)', type: 'textarea' },
    ],
    MOCK_CHARACTERS: [
        { key: 'name', label: 'Имя', type: 'string' },
        { key: 'guild', label: 'Гильдия', type: 'string' },
        { key: 'savedCalc', label: 'Билд (JSON)', type: 'textarea' },
    ],
    INITIAL_TOPICS: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'subcategoryId', label: 'ID подкатегории', type: 'number' },
        { key: 'title', label: 'Заголовок', type: 'string' },
        { key: 'author', label: 'Автор', type: 'string' },
        { key: 'date', label: 'Дата', type: 'string' },
        { key: 'tag', label: 'Тег', type: 'string' },
        { key: 'pinned', label: 'Закреплён', type: 'boolean' },
        { key: 'views', label: 'Просмотры', type: 'number' },
        { key: 'closed', label: 'Закрыта', type: 'boolean' },
    ],
    INITIAL_POSTS: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'topicId', label: 'ID темы', type: 'number' },
        { key: 'author', label: 'Автор', type: 'string' },
        { key: 'content', label: 'Содержание', type: 'textarea' },
        { key: 'date', label: 'Дата', type: 'string' },
        { key: 'likes', label: 'Лайки', type: 'number' },
        { key: 'likedByMe', label: 'Лайкнул я', type: 'boolean' },
        { key: 'edited', label: 'Отредактирован', type: 'boolean' },
    ],
    INITIAL_MAIN_CATEGORIES: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'name', label: 'Название', type: 'string' },
        { key: 'order', label: 'Порядок', type: 'number' },
    ],
    INITIAL_SUBCATEGORIES: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'parentId', label: 'ID родителя', type: 'number' },
        { key: 'name', label: 'Название', type: 'string' },
        { key: 'desc', label: 'Описание', type: 'textarea' },
        { key: 'hidden', label: 'Скрытая', type: 'boolean' },
        { key: 'adminOnly', label: 'Только для админов', type: 'boolean' },
    ],
    DB_NPCS: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'name', label: 'Название', type: 'string' },
        { key: 'icon', label: 'Иконка', type: 'image' },
        { key: 'type', label: 'Тип (Босс/Монстр/Торговец)', type: 'string' },
        { key: 'element', label: 'Стихия/Оружие', type: 'string' },
        { key: 'location', label: 'Локация', type: 'string' },
        { key: 'desc', label: 'Описание', type: 'textarea' },
        { key: 'stats', label: 'Характеристики (JSON: {hp, str, agi, ...})', type: 'textarea' },
        { key: 'abilities', label: 'Способности (JSON: [spellId, ...])', type: 'textarea' },
    ],
    DB_RACIAL_SPELLS: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'name', label: 'Название', type: 'string' },
        { key: 'icon', label: 'Иконка', type: 'image' },
        { key: 'class', label: 'Название расы', type: 'string' },
        { key: 'role', label: 'Роль (поддержка/урон/танк)', type: 'string' },
        { key: 'abilities', label: 'Способности (JSON)', type: 'textarea' },
    ],
    DB_SPELLS: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'name', label: 'Название', type: 'string' },
        { key: 'icon', label: 'Иконка', type: 'image' },
        { key: 'element', label: 'Стихия', type: 'string' },
        { key: 'rank', label: 'Ранг (D-DD-C-CC-B-BB-A-AA-S-SS)', type: 'string' },
        { key: 'desc', label: 'Описание', type: 'textarea' },
        { key: 'formula', label: 'Формула (точечно — пусто = использовать стихийную)', type: 'string' },
        { key: 'cd', label: 'Перезарядка', type: 'string' },
        { key: 'castTime', label: 'Время каста', type: 'string' },
        { key: 'manaCost', label: 'Стоимость маны', type: 'string' },
        { key: 'crystalGen', label: 'Генерация кристаллов', type: 'string' },
        { key: 'crystalReq', label: 'Требует кристаллов', type: 'string' },
    ],
};
const defaultFields = (sampleRow) => {
    if (!sampleRow)
        return [{ key: 'id', label: 'ID', type: 'string' }, { key: 'name', label: 'Значение', type: 'textarea' }];
    return Object.keys(sampleRow).map((k) => {
        const v = sampleRow[k];
        let type = 'string';
        if (typeof v === 'number')
            type = 'number';
        else if (typeof v === 'boolean')
            type = 'boolean';
        else if (typeof v === 'object')
            type = 'textarea';
        return { key: k, label: k, type };
    });
};
// Поля для редактирования рецептов (MOCK_RECIPES — плоский массив с category)
const RECIPE_FIELDS = [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'name', label: 'Название', type: 'string' },
    { key: 'icon', label: 'Иконка', type: 'image' },
    { key: 'category', label: 'Категория (accessories/charms/gems)', type: 'string' },
    { key: 'rarity', label: 'Редкость (common/uncommon/rare/epic/legendary)', type: 'string' },
    { key: 'skill', label: 'Навык', type: 'number' },
    { key: 'desc', label: 'Описание', type: 'textarea' },
    { key: 'mats', label: 'Материалы (JSON: [{name,qty}])', type: 'textarea' },
];
/* ════════════════ SpellFormulasEditor (кастомный UI для SPELL_FORMULAS) ════════════════ */
// Редактор базовых формул стихий: для каждой стихии — поле baseFormula
// и 10 полей процентов надбавки по рангам (D, DD, C, CC, B, BB, A, AA, S, SS).
const SpellFormulasEditor = ({ onToast }) => {
    // dataStore.get('SPELL_FORMULAS') возвращает объект { [element]: { baseFormula, rankPercents } }
    const [version, setVersion] = useState(0);
    const rerender = useCallback(() => setVersion((v) => v + 1), []);
    const formulas = dataStore.get('SPELL_FORMULAS') || DEFAULT_SPELL_FORMULAS;
    const updateField = (element, key, value) => {
        const next = { ...formulas };
        if (!next[element])
            next[element] = { baseFormula: '', rankPercents: { ...DEFAULT_SPELL_FORMULAS[element].rankPercents } };
        if (key === 'baseFormula') {
            next[element] = { ...next[element], baseFormula: value };
        }
        else {
            // key — это ранг (D, DD, C, ...)
            const num = value === '' ? 0 : Number(value);
            if (Number.isNaN(num))
                return;
            next[element] = {
                ...next[element],
                rankPercents: { ...(next[element].rankPercents || {}), [key]: num },
            };
        }
        dataStore.set('SPELL_FORMULAS', next);
        rerender();
    };
    const handleReset = () => {
        dataStore.reset('SPELL_FORMULAS');
        rerender();
        onToast?.('Формулы стихий сброшены к умолчанию');
    };
    const inputStyle = {
        padding: '8px 10px',
        backgroundColor: NEO.bg,
        color: NEO.ink,
        border: `2px solid ${NEO.ink}`,
        fontFamily: '"Space Grotesk", sans-serif',
        fontWeight: 700, fontSize: '13px',
        width: '100%',
        outline: 'none',
    };
    const numInputStyle = { ...inputStyle, width: 56, textAlign: 'center', fontFamily: 'monospace' };
    const labelStyle = {
        fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
        color: NEO.muted, marginBottom: '4px', display: 'block',
    };
    return (<div>
      {/* Info panel */}
      <div style={{
            padding: '14px 18px',
            backgroundColor: NEO.yellow,
            borderBottom: `3px solid ${NEO.ink}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap',
        }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: NEO.ink, lineHeight: 1.5, flex: 1, minWidth: 280 }}>
          <strong style={{ fontFamily: '"Archivo Black", sans-serif' }}>Базовая формула (ранг D)</strong> едина для всех заклинаний стихии.
          Остальные ранги получают процентную надбавку: <span style={{ fontFamily: 'monospace' }}>итог = базовая × (1 + процент/100)</span>.
          <br />Точечное поле «formula» в DB_SPELLS перекрывает стихийную формулу.
          {/* Список доступных переменных для формул */}
          <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: NEO.surface, border: `2px solid ${NEO.ink}`, fontSize: '11px', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 800, marginBottom: '6px', color: NEO.ink, fontFamily: '"Archivo Black", sans-serif', fontSize: '12px' }}>Все переменные для формул:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '3px 12px' }}>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: NEO.limeDark }}>M</span> <span style={{ color: NEO.muted }}>= маг. урон</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: NEO.red }}>P</span> <span style={{ color: NEO.muted }}>= физ. урон</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>str</span> <span style={{ color: NEO.muted }}>= сила</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#16a34a' }}>agi</span> <span style={{ color: NEO.muted }}>= ловкость</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>int</span> <span style={{ color: NEO.muted }}>= интеллект</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: NEO.muted }}>armor</span> <span style={{ color: NEO.muted }}>= броня</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: NEO.yellowDark }}>speed</span> <span style={{ color: NEO.muted }}>= скор. заклинаний</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#d97706' }}>mastery</span> <span style={{ color: NEO.muted }}>= мастерство</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>crit</span> <span style={{ color: NEO.muted }}>= шанс крит.</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#be123c' }}>critDmg</span> <span style={{ color: NEO.muted }}>= крит. урон</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#16a34a' }}>hp</span> <span style={{ color: NEO.muted }}>= текущее здоровье</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#16a34a' }}>maxHp</span> <span style={{ color: NEO.muted }}>= макс. здоровье</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#16a34a' }}>hpRegen</span> <span style={{ color: NEO.muted }}>= восст. здоровья</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0891b2' }}>mp</span> <span style={{ color: NEO.muted }}>= мана</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0891b2' }}>mpRegen</span> <span style={{ color: NEO.muted }}>= восст. маны</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#ea580c' }}>stamina</span> <span style={{ color: NEO.muted }}>= выносливость</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#ea580c' }}>staminaRegen</span> <span style={{ color: NEO.muted }}>= восст. выносливости</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: NEO.yellowDark }}>energyRegen</span> <span style={{ color: NEO.muted }}>= восст. энергии</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#14b8a6' }}>moveSpeed</span> <span style={{ color: NEO.muted }}>= скор. передвижения</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#6366f1' }}>magicResist</span> <span style={{ color: NEO.muted }}>= сопр. магии</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#e11d48' }}>physVamp</span> <span style={{ color: NEO.muted }}>= вамп. физ.</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#c026d3' }}>magicVamp</span> <span style={{ color: NEO.muted }}>= вамп. маг.</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>manaPool</span> <span style={{ color: NEO.muted }}>= манапул</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#8b5cf6' }}>cooldown</span> <span style={{ color: NEO.muted }}>= перезарядка</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#14b8a6' }}>spellRadius</span> <span style={{ color: NEO.muted }}>= радиус заклинаний</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: NEO.red }}>topStat</span> <span style={{ color: NEO.muted }}>= наибольшая характеристика (число)</span></span>
              <span><span style={{ fontFamily: 'monospace', fontWeight: 800, color: NEO.red }}>{'{topStatName}'}</span> <span style={{ color: NEO.muted }}>= название наибольшей (Сила/Ловкость/Интеллект)</span></span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '10px', color: NEO.muted, fontWeight: 600 }}>
              Пример: <span style={{ fontFamily: 'monospace', color: NEO.ink }}>M*0,12*((crit*0,12)/100)</span> · Используйте запятую для дробей: <span style={{ fontFamily: 'monospace', color: NEO.ink }}>0,12</span>
              <br /><span style={{ fontFamily: 'monospace', color: NEO.ink }}>{'{topStat*0,1}'}</span> = 10% от наибольшей характеристики · <span style={{ fontFamily: 'monospace', color: NEO.ink }}>{'{topStatName}'}</span> = «Интеллект» (текстом)
            </div>
          </div>
        </div>
        <NeoButton variant="white" size="sm" onClick={handleReset}>
          <RefreshCw size={13} strokeWidth={3}/> Сбросить
        </NeoButton>
      </div>

      {/* Formulas list */}
      <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflow: 'auto' }} key={version}>
        {SPELL_ELEMENTS.map((element) => {
            const ef = formulas[element] || { baseFormula: '', rankPercents: {} };
            return (<div key={element} style={{
                    backgroundColor: NEO.surface,
                    border: `3px solid ${NEO.ink}`,
                    boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
                    padding: '16px',
                }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span style={{
                    padding: '4px 10px',
                    fontSize: '14px', fontWeight: 800,
                    backgroundColor: NEO.ink, color: NEO.yellow,
                    border: `2px solid ${NEO.ink}`,
                    fontFamily: '"Archivo Black", sans-serif',
                }}>{element}</span>
              </div>

              {/* Base formula */}
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Базовая формула (ранг D)</label>
                <input type="text" value={ef.baseFormula || ''} onChange={(e) => updateField(element, 'baseFormula', e.target.value)} placeholder="например: M*0,12*((crit_chance*0,12)/100)" style={inputStyle}/>
              </div>

              {/* Rank percents */}
              <div>
                <label style={labelStyle}>Процент надбавки по рангам (%)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px' }}>
                  {SPELL_RANKS.map((rank) => {
                    const val = ef.rankPercents?.[rank] ?? 0;
                    const mult = (1 + val / 100).toFixed(2).replace('.', ',');
                    return (<div key={rank}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: NEO.ink, marginBottom: '3px', textAlign: 'center' }}>
                          {rank} {val > 0 && <span style={{ color: NEO.muted }}>×{mult}</span>}
                        </div>
                        <input type="number" value={val} onChange={(e) => updateField(element, rank, e.target.value)} style={numInputStyle}/>
                      </div>);
                })}
                </div>
              </div>
            </div>);
        })}
      </div>
    </div>);
};
/* ════════════════ Main AdminPage ════════════════ */
export const AdminPage = () => {
    const adminParams = useParams();
    const adminNavigate = useNavigate();
    const validColls = COLLECTIONS.map(c => c.name);
    const [activeColl, setActiveCollState] = useState(adminParams.collection && validColls.includes(adminParams.collection) ? adminParams.collection : 'MOCK_NEWS');
    useEffect(() => {
        if (adminParams.collection && validColls.includes(adminParams.collection) && adminParams.collection !== activeColl) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize this view after its route or browser-owned data changes.
            setActiveCollState(adminParams.collection);
        }
    }, [adminParams.collection]);
    const setActiveColl = (name) => {
        setActiveCollState(name);
        adminNavigate('/admin/' + name);
    };
    const [version, setVersion] = useState(0);
    const [toast, setToast] = useState(null);
    const [editing, setEditing] = useState(null); // { row, isNew }
    const [bulkEditing, setBulkEditing] = useState(null); // { rows: [...] }
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [confirm, setConfirm] = useState(null); // { kind, name, rowId }
    const [showJson, setShowJson] = useState(false);
    const [jsonDraft, setJsonDraft] = useState('');
    const rerender = useCallback(() => setVersion((v) => v + 1), []);
    // Для CONSUMABLES — фильтруем DB_REGULAR_ITEMS по type='Расходник'
    const collection = activeColl === 'CONSUMABLES' ? dataStore.get('DB_REGULAR_ITEMS') : dataStore.get(activeColl);
    const rows = activeColl === 'CONSUMABLES'
        ? (Array.isArray(collection) ? collection.filter(r => r.type === 'Расходник') : [])
        : Array.isArray(collection) ? collection : [];
    // Для MOCK_RECIPES (объект с категориями) — преобразуем в плоский массив с полем category
    const recipeRows = activeColl === 'MOCK_RECIPES' && !Array.isArray(collection) && collection && typeof collection === 'object'
        ? Object.entries(collection).flatMap(([cat, arr]) => (Array.isArray(arr) ? arr.map(r => ({ ...r, category: cat })) : []))
        : [];
    const finalRows = activeColl === 'MOCK_RECIPES' ? recipeRows : rows;
    const fields = activeColl === 'CONSUMABLES'
        ? (FIELD_CONFIGS['DB_REGULAR_ITEMS'] || defaultFields(rows[0]))
        : activeColl === 'MOCK_RECIPES'
            ? (RECIPE_FIELDS)
            : (FIELD_CONFIGS[activeColl] || defaultFields(rows[0]));
    // Сброс выделения при смене вкладки
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear selection when switching collections.
    useEffect(() => { setSelectedIds(new Set()); }, [activeColl]);
    const showToast = (msg) => setToast(msg);
    // Сохранение в правильную коллекцию (с учётом MOCK_RECIPES-объекта и CONSUMABLES-фильтра)
    const saveToCollection = (list, collName) => {
        if (collName === 'MOCK_RECIPES') {
            // Преобразуем плоский массив обратно в объект с категориями
            const obj = {};
            list.forEach((r) => {
                const cat = r.category || 'other';
                if (!obj[cat])
                    obj[cat] = [];
                const { category, ...rest } = r;
                obj[cat].push(rest);
            });
            dataStore.set('MOCK_RECIPES', obj);
        }
        else if (collName === 'CONSUMABLES') {
            // Сохраняем обратно в DB_REGULAR_ITEMS: берём все не-расходники + обновлённые расходники
            const allItems = dataStore.get('DB_REGULAR_ITEMS') || [];
            const nonConsumables = allItems.filter(r => r.type !== 'Расходник');
            dataStore.set('DB_REGULAR_ITEMS', [...nonConsumables, ...list]);
        }
        else {
            dataStore.set(collName, list);
        }
    };
    const handleSaveRow = (draft) => {
        const list = [...finalRows];
        // parse JSON fields
        const cleaned = { ...draft };
        fields.forEach((f) => {
            if (f.type === 'textarea' && typeof cleaned[f.key] === 'string') {
                try {
                    cleaned[f.key] = JSON.parse(cleaned[f.key]);
                }
                catch { /* keep as string */ }
            }
        });
        // Auto-generate ID for collections with string IDs (e.g. MOCK_NEWS → n4, n5...)
        if (editing.isNew && cleaned.id !== undefined) {
            const existingIds = list.map((r) => r.id);
            // Detect prefix pattern (e.g. "n1" → prefix="n", num=1)
            const sampleId = existingIds.find((id) => typeof id === 'string' && /^([a-zA-Z]+)(\d+)$/.test(String(id)));
            if (sampleId && !String(cleaned.id).trim()) {
                const match = String(sampleId).match(/^([a-zA-Z]+)(\d+)$/);
                const prefix = match[1];
                const maxNum = Math.max(0, ...existingIds
                    .filter((id) => String(id).startsWith(prefix))
                    .map((id) => parseInt(String(id).replace(prefix, '')) || 0));
                cleaned.id = `${prefix}${maxNum + 1}`;
            }
        }
        if (editing.isNew) {
            list.push(cleaned);
        }
        else {
            // Compare by id (not by reference — rows are re-created from dataStore on each render)
            const idx = list.findIndex((r) => r.id === editing.row.id);
            if (idx >= 0)
                list[idx] = cleaned;
        }
        saveToCollection(list, activeColl);
        setEditing(null);
        rerender();
        showToast(editing.isNew ? 'Запись добавлена' : 'Запись сохранена');
    };
    // Массовое сохранение: применяет изменения к выбранным строкам
    const handleBulkSave = (bulkDraft) => {
        const list = [...finalRows];
        // Обрабатываем draft: парсим JSON для textarea, обрабатываем маркер CLEAR_MARKER
        const cleaned = { ...bulkDraft };
        fields.forEach((f) => {
            const val = cleaned[f.key];
            if (val === undefined)
                return; // не изменять
            if (val === '__CLEAR__') {
                // Очистка: устанавливаем пустое значение по типу поля
                if (f.type === 'number')
                    cleaned[f.key] = 0;
                else if (f.type === 'boolean')
                    cleaned[f.key] = false;
                else if (f.type === 'textarea')
                    cleaned[f.key] = {}; // для JSON-полей (stats, abilities, mats)
                else
                    cleaned[f.key] = ''; // string, image
            }
            else if (f.type === 'textarea' && typeof val === 'string' && val.trim()) {
                try {
                    cleaned[f.key] = JSON.parse(val);
                }
                catch { /* keep as string */ }
            }
        });
        // Применяем только заданные поля к выбранным строкам (undefined = не трогать)
        let updatedCount = 0;
        for (let i = 0; i < list.length; i++) {
            if (selectedIds.has(list[i].id)) {
                list[i] = { ...list[i], ...cleaned };
                updatedCount++;
            }
        }
        saveToCollection(list, activeColl);
        setBulkEditing(null);
        setSelectedIds(new Set());
        rerender();
        showToast(`Обновлено записей: ${updatedCount}`);
    };
    const handleDelete = (row) => {
        const list = finalRows.filter((r) => r.id !== row.id);
        saveToCollection(list, activeColl);
        setConfirm(null);
        rerender();
        showToast('Запись удалена');
    };
    // Массовое удаление выбранных
    const handleBulkDelete = () => {
        const list = finalRows.filter((r) => !selectedIds.has(r.id));
        saveToCollection(list, activeColl);
        setSelectedIds(new Set());
        setConfirm(null);
        rerender();
        showToast(`Удалено: ${finalRows.length - list.length}`);
    };
    // Переключение выделения строки
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    const toggleSelectAll = () => {
        setSelectedIds(prev => {
            if (prev.size === finalRows.length)
                return new Set();
            return new Set(finalRows.map(r => r.id));
        });
    };
    const handleReset = () => {
        dataStore.reset(activeColl);
        setConfirm(null);
        showToast('Коллекция сброшена к умолчанию');
    };
    const handleExport = () => {
        const blob = new Blob([dataStore.exportAll()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mmoportal-data.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Данные экспортированы');
    };
    const handleImport = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                dataStore.importAll(String(reader.result));
                setShowJson(false);
                showToast('Данные импортированы');
            }
            catch {
                showToast('Ошибка: неверный JSON');
            }
        };
        reader.readAsText(file);
    };
    const handleSaveJson = () => {
        try {
            dataStore.importAll(jsonDraft);
            setShowJson(false);
            setJsonDraft('');
            showToast('JSON применён');
        }
        catch {
            showToast('Ошибка: неверный JSON');
        }
    };
    return (<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {toast && <Toast message={toast} onClose={() => setToast(null)}/>}
      {confirm && (<Confirm title={confirm.title} message={confirm.message} onCancel={() => setConfirm(null)} onConfirm={confirm.action}/>)}
      {editing && (<RowEditor row={editing.row} fields={fields} isNew={editing.isNew} activeColl={activeColl} onSave={handleSaveRow} onCancel={() => setEditing(null)}/>)}
      {/* FormulaHelper — фиксированная боковая панель справа, видна при редактировании */}
      {(editing || bulkEditing) && typeof document !== 'undefined' && createPortal(<div style={{
                position: 'fixed', top: '50%', right: 'calc(50% - 600px)', transform: 'translateY(-50%)',
                zIndex: 150, width: '240px', maxHeight: '80vh', overflowY: 'auto',
            }}>
          <FormulaHelper />
        </div>, document.body)}
      {bulkEditing && (<BulkEditor rows={bulkEditing.rows} fields={fields} onSave={handleBulkSave} onCancel={() => setBulkEditing(null)}/>)}
      {showJson && (<div onClick={() => setShowJson(false)} style={{
                position: 'fixed', inset: 0, zIndex: 200,
                backgroundColor: 'rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
            }}>
          <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: '1200px',
                backgroundColor: NEO.surface,
                border: `4px solid ${NEO.ink}`,
                boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
                padding: '24px',
                maxHeight: '92vh', overflowY: 'auto',
                display: 'flex', gap: '16px', flexWrap: 'wrap',
            }}>
            <div style={{ flex: 1, minWidth: 500 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: '"Archivo Black", sans-serif', fontSize: '1.5rem', color: NEO.ink, margin: 0 }}>
                  <span style={{ width: 32, height: 32, backgroundColor: NEO.cyan, border: `3px solid ${NEO.ink}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileJson size={18} strokeWidth={2.5} style={{ color: NEO.ink }}/>
                  </span>
                  Импорт / Редактор JSON
                </h3>
                <button onClick={() => setShowJson(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }} title="Закрыть">
                  <X size={20} strokeWidth={3} style={{ color: NEO.ink }}/>
                </button>
              </div>
              <p style={{ marginBottom: '12px', fontSize: '12px', color: NEO.muted, fontWeight: 500 }}>
                Вставьте JSON с переопределениями коллекций (merge с текущими данными):
              </p>
              <NeoTextarea value={jsonDraft} onChange={(e) => setJsonDraft(e.target.value)} rows={24} placeholder='{"MOCK_NEWS": [...], "INITIAL_AUCTION": [...]}' style={{ fontFamily: 'monospace', fontSize: '13px', width: '100%' }}/>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{
                display: 'inline-flex', cursor: 'pointer', alignItems: 'center', gap: '8px',
                padding: '10px 18px', fontSize: '14px', fontWeight: 700,
                backgroundColor: NEO.surface, color: NEO.ink,
                border: `3px solid ${NEO.ink}`,
                boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
                fontFamily: '"Space Grotesk", sans-serif',
            }}>
                  <Upload size={16} strokeWidth={3}/> Из файла
                  <input type="file" accept="application/json" onChange={handleImport} style={{ display: 'none' }}/>
                </label>
                <NeoButton variant="lime" onClick={handleSaveJson}>
                  <Save size={16} strokeWidth={3}/> Применить
                </NeoButton>
              </div>
            </div>
            <div style={{ width: 280, flexShrink: 0 }}>
              <FormulaHelper />
            </div>
          </div>
        </div>)}

      {/* Header + global actions */}
      <NeoPageHeader icon={Database} iconBg={NEO.lime} title="База данных" subtitle="Редактирование данных сайта. Сохраняется в браузере (localStorage)." actions={<>
            <NeoButton variant="white" onClick={handleExport}>
              <Download size={16} strokeWidth={3}/> Экспорт
            </NeoButton>
            <NeoButton variant="yellow" onClick={() => { setJsonDraft(''); setShowJson(true); }}>
              <Upload size={16} strokeWidth={3}/> Импорт
            </NeoButton>
            <NeoButton variant="red" onClick={() => setConfirm({
                title: 'Сбросить ВСЕ данные?',
                message: 'Все изменения будут потеряны, данные вернутся к значениям по умолчанию из gameData.js.',
                action: () => { dataStore.resetAll(); setConfirm(null); showToast('Все данные сброшены'); },
            })}>
              <RefreshCw size={16} strokeWidth={3}/> Сбросить всё
            </NeoButton>
          </>}/>

      <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', flexWrap: 'wrap' }}>
        {/* Collections sidebar */}
        <aside style={{
            width: '100%', maxWidth: '288px', flexShrink: 0,
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
            padding: '14px',
            alignSelf: 'flex-start',
        }}>
          <h3 style={{
            marginBottom: '10px', padding: '0 8px',
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em',
            color: NEO.ink,
        }}>
            Коллекции
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {COLLECTIONS.map((c) => {
            const isActive = activeColl === c.name;
            const data = c.name === 'CONSUMABLES'
                ? (dataStore.get('DB_REGULAR_ITEMS') || []).filter(r => r.type === 'Расходник')
                : dataStore.get(c.name);
            // Для MOCK_RECIPES (объект с категориями) — считаем сумму всех рецептов
            let count;
            if (c.name === 'MOCK_RECIPES' && data && typeof data === 'object' && !Array.isArray(data)) {
                count = Object.values(data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
            }
            else {
                count = Array.isArray(data) ? data.length : Object.keys(data || {}).length;
            }
            return (<button key={c.name} onClick={() => setActiveColl(c.name)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 12px',
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: '13px', fontWeight: 600,
                    color: NEO.ink,
                    backgroundColor: isActive ? NEO.yellow : NEO.surface,
                    border: `3px solid ${NEO.ink}`,
                    boxShadow: isActive ? `4px 4px 0px 0px ${NEO.ink}` : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                    textAlign: 'left',
                }} onMouseEnter={(e) => {
                    if (isActive)
                        return;
                    e.currentTarget.style.transform = 'translate(2px, 2px)';
                    e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`;
                }} onMouseLeave={(e) => {
                    if (isActive)
                        return;
                    e.currentTarget.style.transform = 'translate(0, 0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.label}</span>
                  <span style={{
                    marginLeft: '8px', padding: '2px 8px',
                    backgroundColor: isActive ? NEO.ink : NEO.bg,
                    color: isActive ? NEO.yellow : NEO.ink,
                    border: `2px solid ${NEO.ink}`,
                    fontFamily: '"Archivo Black", sans-serif',
                    fontSize: '11px',
                    flexShrink: 0,
                }}>
                    {count}
                  </span>
                </button>);
        })}
          </div>
        </aside>

        {/* Editor */}
        <div style={{
            flex: 1, minWidth: 280,
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
            overflow: 'hidden',
        }}>
          {activeColl === 'SPELL_FORMULAS' ? (
        /* Кастомный редактор формул стихий */
        <SpellFormulasEditor onToast={showToast}/>) : (<>
          {/* Toolbar */}
          <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: NEO.bg,
                borderBottom: `3px solid ${NEO.ink}`,
                flexWrap: 'wrap',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.125rem', color: NEO.ink, margin: 0 }}>
                {COLLECTIONS.find((c) => c.name === activeColl)?.label}
              </h2>
              <span style={{
                padding: '2px 8px',
                backgroundColor: NEO.ink, color: NEO.yellow,
                border: `2px solid ${NEO.ink}`,
                fontFamily: 'monospace', fontSize: '11px', fontWeight: 700,
            }}>
                {activeColl}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <NeoButton variant="white" size="sm" onClick={() => setConfirm({
                title: `Сбросить «${activeColl}»?`,
                message: 'Коллекция вернётся к значению по умолчанию из gameData.js.',
                action: handleReset,
            })}>
                <RefreshCw size={13} strokeWidth={3}/> Сбросить
              </NeoButton>
              <NeoButton variant="lime" size="sm" onClick={() => setEditing({ row: null, isNew: true })}>
                <Plus size={14} strokeWidth={3}/> Добавить
              </NeoButton>
              {selectedIds.size > 0 && (<>
                  <span style={{ padding: '4px 10px', fontSize: 12, fontWeight: 800, backgroundColor: NEO.yellow, color: NEO.ink, border: `2px solid ${NEO.ink}` }}>
                    Выделено: {selectedIds.size}
                  </span>
                  <NeoButton variant="cyan" size="sm" onClick={() => setBulkEditing({ rows: finalRows.filter(r => selectedIds.has(r.id)) })}>
                    <Pencil size={13} strokeWidth={3}/> Редактировать выделенные
                  </NeoButton>
                  <NeoButton variant="red" size="sm" onClick={() => setConfirm({ title: `Удалить ${selectedIds.size} записей?`, message: 'Выделенные записи будут удалены безвозвратно.', action: handleBulkDelete })}>
                    <Trash2 size={13} strokeWidth={3}/> Удалить выделенные
                  </NeoButton>
                </>)}
            </div>
          </div>

          {/* Table */}
          <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
            {finalRows.length === 0 ? (<div style={{ padding: '40px' }}>
                <NeoEmpty icon={Database} text="Коллекция пуста."/>
              </div>) : (<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px', backgroundColor: NEO.ink, color: NEO.yellow, borderRight: `2px solid ${NEO.yellow}`, width: 40, textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedIds.size === finalRows.length && finalRows.length > 0} onChange={toggleSelectAll} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: NEO.lime }} title="Выделить все"/>
                    </th>
                    {fields.slice(0, 5).map((f) => (<th key={f.key} style={{
                        position: 'sticky', top: 0, zIndex: 10,
                        padding: '12px',
                        backgroundColor: NEO.ink,
                        color: NEO.yellow,
                        borderRight: `2px solid ${NEO.yellow}`,
                        fontFamily: '"Archivo Black", sans-serif',
                        fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
                        textAlign: 'left',
                    }}>
                        {f.label}
                      </th>))}
                    <th style={{
                    position: 'sticky', top: 0, zIndex: 10,
                    padding: '12px',
                    backgroundColor: NEO.ink,
                    color: NEO.yellow,
                    fontFamily: '"Archivo Black", sans-serif',
                    fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
                    textAlign: 'right',
                }}>
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {finalRows.map((row, idx) => (<tr key={idx} style={{
                        backgroundColor: selectedIds.has(row.id) ? NEO.yellow : (idx % 2 === 0 ? NEO.surface : NEO.bg),
                        borderBottom: `2px solid ${NEO.ink}`,
                    }}>
                      <td style={{ padding: '12px', textAlign: 'center', borderRight: `1px solid ${NEO.ink}` }}>
                        <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: NEO.lime }}/>
                      </td>
                      {fields.slice(0, 5).map((f) => (<td key={f.key} title={String(row[f.key] ?? '')} style={{
                            padding: '12px',
                            maxWidth: '220px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            color: NEO.ink,
                            fontWeight: 500,
                            borderRight: `1px solid ${NEO.ink}`,
                        }}>
                          {typeof row[f.key] === 'object' ? JSON.stringify(row[f.key]) : String(row[f.key] ?? '—')}
                        </td>))}
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button onClick={() => setEditing({ row, isNew: false })} title="Редактировать" style={{
                        padding: '6px 10px',
                        backgroundColor: NEO.cyan,
                        color: NEO.ink,
                        border: `2px solid ${NEO.ink}`,
                        boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                        cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.1s, box-shadow 0.1s',
                    }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(1px, 1px)'; e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = `3px 3px 0px 0px ${NEO.ink}`; }} onMouseDown={(e) => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = `0px 0px 0px 0px ${NEO.ink}`; }} onMouseUp={(e) => { e.currentTarget.style.transform = 'translate(1px, 1px)'; e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`; }}>
                            <Pencil size={13} strokeWidth={3}/>
                          </button>
                          <button onClick={() => setConfirm({ title: 'Удалить запись?', message: 'Запись будет удалена безвозвратно.', action: () => handleDelete(row) })} title="Удалить" style={{
                        padding: '6px 10px',
                        backgroundColor: NEO.red,
                        color: '#fff',
                        border: `2px solid ${NEO.ink}`,
                        boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                        cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.1s, box-shadow 0.1s',
                    }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(1px, 1px)'; e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = `3px 3px 0px 0px ${NEO.ink}`; }} onMouseDown={(e) => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = `0px 0px 0px 0px ${NEO.ink}`; }} onMouseUp={(e) => { e.currentTarget.style.transform = 'translate(1px, 1px)'; e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`; }}>
                            <Trash2 size={13} strokeWidth={3}/>
                          </button>
                        </div>
                      </td>
                    </tr>))}
                </tbody>
              </table>)}
          </div>
            </>)}
        </div>
      </div>

      <div key={version} className="hidden"/>
    </div>);
};
