// noinspection ExceptionCaughtLocallyJS

const that = this;

chrome.storage.local.get(['API_URL', 'ACCESS_TOKEN', 'OPENAI_KEY'], (result) => {
    that.API_URL = result.API_URL;
    that.ACCESS_TOKEN = result.ACCESS_TOKEN;
});

// loaded from styles.js
that.components = {
    curtain: undefined,
    popupSearchBar: undefined,
    searchBarId: undefined,
    openAiIcon: undefined,
    createElement: (parent, elementTemplate) => {
        const el = document.createElement('template');
        el.innerHTML = elementTemplate;
        parent.appendChild(el.content);
        return el;
    }
};

// imports and app starting
(async () => {
    const importAsync = (fileName) => import(chrome.runtime.getURL(fileName));

    const tabUrl = await getCurrentTabUrl()
    that.SPACE_ID = extractSpaceId(tabUrl)
    
    const kaitenApi = await importAsync("kaitenApi.js");
    that.fetchKaitenAllData = kaitenApi.fetchKaitenAllData;
    
    const kaitenData = await that.fetchKaitenAllData();
    console.log("Processing data...");


    if (!kaitenData || kaitenData.length === 0) {
        console.error("No data fetched from Kaiten.");
        return;
    }

    // Фильтруем карточки, у которых есть start_work_at, completed_at и size_text с "SP"
    const validCards = kaitenData.filter(card =>
        card.start_work_at &&
        card.completed_at &&
        card.size_text 
        // && card.size_text.includes("SP")
    );

    if (validCards.length === 0) {
        console.error("No valid cards with 'SP' in size_text and valid times.");
        return;
    }

    // Функция для подсчета рабочих часов между двумя датами
    const calculateWorkingHours = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);

        let totalHours = 0;

        // Проходим по каждому дню между стартом и окончанием
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const day = date.getDay();
            // Пропускаем выходные
            if (day === 0 || day === 6) continue;

            // Рассчитываем часы внутри одного рабочего дня
            const startOfDay = new Date(date);
            startOfDay.setHours(9, 0, 0, 0); // Начало рабочего дня: 9:00
            const endOfDay = new Date(date);
            endOfDay.setHours(17, 0, 0, 0); // Конец рабочего дня: 17:00

            if (date.getTime() === startDate.getTime()) {
                // Если текущий день совпадает с днем начала
                totalHours += Math.max(0, Math.min(endOfDay, endDate) - Math.max(startOfDay, startDate)) / (1000 * 60 * 60);
            } else if (date.getTime() === endDate.getTime()) {
                // Если текущий день совпадает с днем окончания
                totalHours += Math.max(0, Math.min(endOfDay, endDate) - startOfDay) / (1000 * 60 * 60);
            } else {
                // Для всех остальных дней
                totalHours += (endOfDay - startOfDay) / (1000 * 60 * 60);
            }
        }

        return totalHours;
    };

    // Группируем карточки по size_text
    const groupedBySize = validCards.reduce((acc, card) => {
        const size = card.size_text || "Unknown";
        const startWorkTime = new Date(card.start_work_at);
        const completedTime = new Date(card.completed_at);

        // Рассчитываем только рабочие часы
        const durationInHours = calculateWorkingHours(startWorkTime, completedTime);

        if (!acc[size]) {
            acc[size] = [];
        }
        acc[size].push(durationInHours);

        return acc;
    }, {});

    // Рассчитываем среднее время выполнения для каждого размера
    const averageTimes = Object.entries(groupedBySize).map(([size, durations]) => {
        const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
        const averageDuration = totalDuration / durations.length;

        return { size, averageDuration: averageDuration.toFixed(2) }; // Округляем до двух знаков
    });

    // Выводим результат в консоль
    console.log("Average completion times by size (in working hours):");
    averageTimes.forEach(({ size, averageDuration }) => {
        console.log(`${size}: ${averageDuration} working hours`);
    });
})()


async function getCurrentTabUrl() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({type: "GET_TAB_URL"}, (response) => {
            if (chrome.runtime.lastError || response.error) {
                reject(chrome.runtime.lastError || response.error);
            } else {
                resolve(response.url);
            }
        });
    });
}

function extractSpaceId(url) {
    const match = url.match(/space\/(\d+)/);
    return match ? match[1] : null;
}