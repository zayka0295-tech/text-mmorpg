export class ItemStatsSystem {
    constructor() {
        this.itemCategories = {
            weapon: 'Зброя',
            armor: 'Броня',
            accessory: 'Аксесуари',
            consumable: 'Витратні матеріали',
            material: 'Матеріали',
            ship: 'Кораблі',
            special: 'Особливі'
        };

        this.rarityColors = {
            common: '#808080',
            uncommon: '#00ff00',
            rare: '#0080ff',
            epic: '#8000ff',
            legendary: '#ff8000',
            mythic: '#ff0000'
        };
    }

    /**
     * Отримує повну статистику предмета
     */
    getItemStats(item, player) {
        const baseStats = this.getBaseItemStats(item);
        const comparisonStats = this.getComparisonStats(item, player);
        const usageStats = this.getUsageStats(item, player);
        const marketStats = this.getMarketStats(item);

        return {
            base: baseStats,
            comparison: comparisonStats,
            usage: usageStats,
            market: marketStats
        };
    }

    /**
     * Отримує базову статистику предмета
     */
    getBaseItemStats(item) {
        return {
            id: item.id,
            name: item.name,
            description: item.description || '',
            category: this.itemCategories[item.type] || item.type,
            rarity: item.rarity || 'common',
            rarityColor: this.rarityColors[item.rarity] || this.rarityColors.common,
            level: item.level || 1,
            value: item.value || 0,
            stackable: item.stackable || false,
            maxStack: item.maxStack || 1,
            consumable: item.consumable || false,
            tradable: item.tradable !== false,
            sellable: item.sellable !== false
        };
    }

    /**
     * Отримує статистику порівняння з поточним спорядженням
     */
    getComparisonStats(item, player) {
        const comparison = {
            isEquipped: false,
            isBetter: false,
            isWorse: false,
            isSame: false,
            statDifferences: {}
        };

        // Перевіряємо, чи предмет надягнутий
        if (player.equipment) {
            for (const [slot, equippedItem] of Object.entries(player.equipment)) {
                if (equippedItem && equippedItem.id === item.id) {
                    comparison.isEquipped = true;
                    comparison.isSame = true;
                    break;
                }
            }
        }

        // Порівнюємо стати, якщо це зброя або броня
        if (item.attack || item.defense) {
            comparison.statDifferences = this.compareItemStats(item, player);
            comparison.isBetter = this.isItemBetter(item, player);
            comparison.isWorse = this.isItemWorse(item, player);
        }

        return comparison;
    }

    /**
     * Порівнює стати предметів
     */
    compareItemStats(item, player) {
        const differences = {};
        const equippedItem = this.getEquippedItemInSlot(item, player);

        if (!equippedItem) {
            // Якщо нічого не надягнуто, всі стати позитивні
            if (item.attack) differences.attack = item.attack;
            if (item.defense) differences.defense = item.defense;
            if (item.critChance) differences.critChance = item.critChance;
            if (item.critDamage) differences.critDamage = item.critDamage;
            if (item.hp) differences.hp = item.hp;
            if (item.forcePoints) differences.forcePoints = item.forcePoints;
        } else {
            // Порівнюємо з надягнутим предметом
            if (item.attack && equippedItem.attack) {
                differences.attack = item.attack - equippedItem.attack;
            }
            if (item.defense && equippedItem.defense) {
                differences.defense = item.defense - equippedItem.defense;
            }
            if (item.critChance && equippedItem.critChance) {
                differences.critChance = item.critChance - equippedItem.critChance;
            }
            if (item.critDamage && equippedItem.critDamage) {
                differences.critDamage = item.critDamage - equippedItem.critDamage;
            }
            if (item.hp && equippedItem.hp) {
                differences.hp = item.hp - equippedItem.hp;
            }
            if (item.forcePoints && equippedItem.forcePoints) {
                differences.forcePoints = item.forcePoints - equippedItem.forcePoints;
            }
        }

        return differences;
    }

    /**
     * Перевіряє, чи предмет кращий
     */
    isItemBetter(item, player) {
        const differences = this.compareItemStats(item, player);
        let positiveCount = 0;
        let negativeCount = 0;

        for (const [stat, diff] of Object.entries(differences)) {
            if (diff > 0) positiveCount++;
            else if (diff < 0) negativeCount++;
        }

        return positiveCount > negativeCount;
    }

    /**
     * Перевіряє, чи предмет гірший
     */
    isItemWorse(item, player) {
        const differences = this.compareItemStats(item, player);
        let positiveCount = 0;
        let negativeCount = 0;

        for (const [stat, diff] of Object.entries(differences)) {
            if (diff > 0) positiveCount++;
            else if (diff < 0) negativeCount++;
        }

        return negativeCount > positiveCount;
    }

    /**
     * Отримує надягнутий предмет в слоті
     */
    getEquippedItemInSlot(item, player) {
        if (!player.equipment) return null;

        // Визначаємо слот для предмета
        let slot = null;
        if (item.type === 'weapon') {
            slot = 'weapon1';
        } else if (item.type === 'armor') {
            slot = 'armor';
        } else if (item.type === 'accessory') {
            slot = 'accessory1';
        }

        return slot ? player.equipment[slot] : null;
    }

    /**
     * Отримує статистику використання
     */
    getUsageStats(item, player) {
        const usage = {
            canUse: this.canUseItem(item, player),
            requirements: this.getItemRequirements(item),
            effects: this.getItemEffects(item),
            cooldown: this.getItemCooldown(item),
            uses: this.getItemUses(item, player)
        };

        return usage;
    }

    /**
     * Перевіряє, чи гравець може використати предмет
     */
    canUseItem(item, player) {
        // Перевірка рівня
        if (item.level && player.level < item.level) {
            return false;
        }

        // Перевірка титулу
        if (item.reqTitle && player.title !== item.reqTitle) {
            return false;
        }

        // Перевірка класу
        if (item.reqClass && player.className !== item.reqClass) {
            return false;
        }

        // Перевірка вирівнювання
        if (item.reqAlignment) {
            const alignment = item.reqAlignment.toLowerCase();
            if (alignment === 'light' && player.alignment < 0) return false;
            if (alignment === 'dark' && player.alignment > 0) return false;
        }

        return true;
    }

    /**
     * Отримує вимоги до предмета
     */
    getItemRequirements(item) {
        const requirements = [];

        if (item.level) {
            requirements.push({ type: 'level', value: item.level, met: false });
        }

        if (item.reqTitle) {
            requirements.push({ type: 'title', value: item.reqTitle, met: false });
        }

        if (item.reqClass) {
            requirements.push({ type: 'class', value: item.reqClass, met: false });
        }

        if (item.reqAlignment) {
            requirements.push({ type: 'alignment', value: item.reqAlignment, met: false });
        }

        return requirements;
    }

    /**
     * Отримує ефекти предмета
     */
    getItemEffects(item) {
        const effects = [];

        if (item.heal) {
            effects.push({ type: 'heal', value: item.heal, description: `Лікує ${item.heal} HP` });
        }

        if (item.forcePoints) {
            effects.push({ type: 'force', value: item.forcePoints, description: `Відновлює ${item.forcePoints} FP` });
        }

        if (item.buff) {
            effects.push({ type: 'buff', value: item.buff, description: `Надає баф: ${item.buff}` });
        }

        if (item.duration) {
            effects.push({ type: 'duration', value: item.duration, description: `Тривалість: ${item.duration}с` });
        }

        return effects;
    }

    /**
     * Отримує кулдаун предмета
     */
    getItemCooldown(item) {
        return {
            hasCooldown: !!item.cooldown,
            cooldownTime: item.cooldown || 0,
            currentCooldown: 0 // Можна додати логіку відстеження
        };
    }

    /**
     * Отримує кількість використань
     */
    getItemUses(item, player) {
        if (item.consumable) {
            const inventoryItem = player.inventory?.find(i => i.id === item.id);
            return {
                total: inventoryItem?.amount || 0,
                maxStack: item.maxStack || 1,
                canStack: item.stackable || false
            };
        }

        return {
            total: 1,
            maxStack: 1,
            canStack: false
        };
    }

    /**
     * Отримує ринкову статистику
     */
    getMarketStats(item) {
        return {
            basePrice: item.value || 0,
            sellPrice: Math.floor((item.value || 0) * 0.7), // 70% від базової ціни
            buyPrice: Math.floor((item.value || 0) * 1.3), // 130% від базової ціни
            marketDemand: this.getMarketDemand(item),
            rarity: item.rarity || 'common',
            tradable: item.tradable !== false,
            sellable: item.sellable !== false
        };
    }

    /**
     * Отримує попит на ринку
     */
    getMarketDemand(item) {
        // Спрощена логіка попиту
        const demandFactors = {
            weapon: 'high',
            armor: 'medium',
            consumable: 'high',
            material: 'medium',
            accessory: 'low'
        };

        return demandFactors[item.type] || 'medium';
    }

    /**
     * Форматує значення для відображення
     */
    formatValue(value, type = 'number') {
        switch (type) {
            case 'percentage':
                return `${value}%`;
            case 'currency':
                return `${value.toLocaleString()} кр.`;
            case 'time':
                return `${value}с`;
            case 'damage':
                return `+${value} шкоди`;
            case 'defense':
                return `+${value} захисту`;
            case 'heal':
                return `+${value} HP`;
            case 'force':
                return `+${value} FP`;
            default:
                return value.toString();
        }
    }

    /**
     * Отримує колір редкості
     */
    getRarityColor(rarity) {
        return this.rarityColors[rarity] || this.rarityColors.common;
    }

    /**
     * Отримує назву редкості
     */
    getRarityName(rarity) {
        const names = {
            common: 'Звичайний',
            uncommon: 'Незвичайний',
            rare: 'Рідкісний',
            epic: 'Епічний',
            legendary: 'Легендарний',
            mythic: 'Міфічний'
        };
        return names[rarity] || 'Звичайний';
    }

    /**
     * Отримує іконку типу предмета
     */
    getItemTypeIcon(type) {
        const icons = {
            weapon: '⚔️',
            armor: '🛡️',
            accessory: '💍',
            consumable: '💊',
            material: '🔨',
            ship: '🚀',
            special: '✨'
        };
        return icons[type] || '📦';
    }

    /**
     * Отримує повний опис предмета
     */
    getItemDescription(item) {
        let description = item.description || '';

        // Додаємо статистику до опису
        const stats = [];
        if (item.attack) stats.push(`Атака: +${item.attack}`);
        if (item.defense) stats.push(`Захист: +${item.defense}`);
        if (item.critChance) stats.push(`Кріт. шанс: +${item.critChance}%`);
        if (item.critDamage) stats.push(`Кріт. шкода: x${item.critDamage}`);
        if (item.hp) stats.push(`HP: +${item.hp}`);
        if (item.forcePoints) stats.push(`FP: +${item.forcePoints}`);

        if (stats.length > 0) {
            description += '\n\n' + stats.join('\n');
        }

        return description;
    }
}
