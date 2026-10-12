// @ts-nocheck
// misc.ts — general mock data (news, auction, characters).
// Split from gameData.ts for maintainability.

export const MOCK_NEWS = [
  { id: 1, title: "Патч 1.2: Возвращение Древних", date: "12 Марта 2026", excerpt: "Новый рейд, изменение баланса классов и долгожданное открытие новой зоны." },
  { id: 2, title: "Сезон PvP объявляется открытым!", date: "10 Марта 2026", excerpt: "Сражайтесь на аренах и получайте уникальные гладиаторские доспехи." },
  { id: 3, title: "Технические работы на серверах", date: "8 Марта 2026", excerpt: "Серверы будут недоступны с 02:00 до 06:00 по МСК для установки обновления." },
];

export const INITIAL_AUCTION = [
  { id: 1, name: "Меч Тысячи Истин", type: "Оружие", rarity: "legendary", seller: "DarkKnight99", time: "2ч 15м", bid: 15000, buyout: 20000 },
  { id: 2, name: "Эликсир Мудрости", type: "Расходник", rarity: "rare", seller: "AlchemistBob", time: "12ч 00м", bid: 50, buyout: 75 },
  { id: 3, name: "Нагрудник Драконьей Чешуи", type: "Броня", rarity: "epic", seller: "TankPro", time: "5ч 30м", bid: 2500, buyout: 3000 },
  { id: 4, name: "Ржавый кинжал", type: "Оружие", rarity: "uncommon", seller: "Rogue123", time: "24ч 00м", bid: 10, buyout: 15 },
  { id: 5, name: "Зелье здоровья", type: "Расходник", rarity: "uncommon", seller: "HealerPro", time: "48ч 00м", bid: 5, buyout: 10 },
];

export const MOCK_CHARACTERS = [
  { 
    name: "Иллиданзор", guild: "Разящие Клином", level: 80, race: "Эльф Крови", class: "Маг",
    savedCalc: { armorType: 'cloth', gemLevel: 12, stats: { str: 0, agi: 0, int: 3000, speedPoints: 800 }, acc1Id: 101, acc2Id: 89, gemAcc1Id: 1, gemAcc2Id: 2, gemAcc3Id: null, gemAcc4Id: null }
  },
  { 
    name: "Артас", guild: "Рыцари Света", level: 80, race: "Человек", class: "Паладин",
    savedCalc: { armorType: 'plates', gemLevel: 10, stats: { str: 3000, agi: 0, int: 0, speedPoints: 0 }, acc1Id: 52, acc2Id: null, gemAcc1Id: null, gemAcc2Id: null, gemAcc3Id: null, gemAcc4Id: null }
  }
];
