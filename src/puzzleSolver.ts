import * as fs from 'node:fs';
import * as path from 'node:path';

// Шлях до файлу з вхідними цифровими фрагментами (розташований у корені проекту)
const FRAGMENTS_FILE_PATH = path.join(__dirname, '../fragments.txt');

/** 
 * Ця функція завантажує текстові фрагменти з файлу, очищає їх від зайвих пробілів
 * та відсікає порожні рядки.
 */

function loadFragmentsFromFile(filePath: string): string[] {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    return fileContent
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  } catch (error) {
    console.error('❌ Помилка при читанні файлу з фрагментами:', error);
    return [];
  }
}

/**
 * Знаходить найдовший зв'язний ланцюжок фрагментів (Ейлерів шлях) за допомогою теорії графів.
 * Кожен цифровий фрагмент розглядається як ребро:
 * - Перші 2 цифри — початкова вершина (source)
 * - Останні 2 цифри — кінцева вершина (target)
 */

function findEulerianPath(fragments: string[]): string[] {
  if (fragments.length === 0) return [];

  const isFragmentUsed: boolean[] = new Array(fragments.length).fill(false);
  const adjacencyList = new Map<string, number[]>();
  const outDegreeMap = new Map<string, number>();
  const inDegreeMap = new Map<string, number>();

  // КРОК 1: Побудова орграфа (списку суміжності та підрахунок степенів вершин)
  fragments.forEach((fragment, fragmentIndex) => {
    const sourceNode = fragment.slice(0, 2);
    const targetNode = fragment.slice(-2);

    if (!adjacencyList.has(sourceNode)) {
      adjacencyList.set(sourceNode, []);
    }
    adjacencyList.get(sourceNode)!.push(fragmentIndex);

    outDegreeMap.set(sourceNode, (outDegreeMap.get(sourceNode) || 0) + 1);
    inDegreeMap.set(targetNode, (inDegreeMap.get(targetNode) || 0) + 1);
  });

  const allGraphNodes = new Set<string>([
    ...adjacencyList.keys(),
    ...inDegreeMap.keys()
  ]);

  // КРОК 2: Визначення стартової вершини для Ейлерова шляху
  let startNode: string | null = null;

  // Шукаємо класичну початкову вершину Ейлерова шляху, де вихідний степінь на 1 більший за вхідний

  for (const node of allGraphNodes) {
    const outDegree = outDegreeMap.get(node) || 0;
    const inDegree = inDegreeMap.get(node) || 0;

    if (outDegree - inDegree === 1) {
      startNode = node;
      break;
    }
  }

  // Якщо такої вершини немає, обираємо будь-яку вершину з наявними вихідними ребрами
  if (!startNode) {
    for (const node of allGraphNodes) {
      if ((outDegreeMap.get(node) || 0) > 0) {
        startNode = node;
        break;
      }
    }
  }

  if (!startNode) return [];

  // КРОК 3: Ітеративний обхід графа зі стеком (алгоритм знаходження Ейлерового шляху)
  const traversalStack: string[] = [startNode];
  const pathFragmentIndices: number[] = [];
  const edgePointers = new Map<string, number>();

  for (const node of adjacencyList.keys()) {
    edgePointers.set(node, 0);
  }

  while (traversalStack.length > 0) {
    const currentNode = traversalStack[traversalStack.length - 1]!;
    const neighboringIndices = adjacencyList.get(currentNode) || [];
    const currentEdgePointer = edgePointers.get(currentNode) || 0;

    // Якщо у вершини ще є невикористані вихідні ребра (сусіди)
    if (currentEdgePointer < neighboringIndices.length) {
      const fragmentIndex = neighboringIndices[currentEdgePointer];
      edgePointers.set(currentNode, currentEdgePointer + 1);

      if (fragmentIndex !== undefined && !isFragmentUsed[fragmentIndex]) {
        isFragmentUsed[fragmentIndex] = true;
        const currentFragment = fragments[fragmentIndex];

        if (currentFragment) {
          const nextNode = currentFragment.slice(-2);
          traversalStack.push(nextNode);
          pathFragmentIndices.push(fragmentIndex);
        }
      }
    } else {
      // Якщо дійшли до тупика або використали всі ребра — знімаємо вершину зі стека
      traversalStack.pop();
    }
  }

  // КРОК 4: Повертаємо послідовність ребер у правильному порядку
  pathFragmentIndices.reverse();
  return pathFragmentIndices
    .map(index => fragments[index]!)
    .filter(Boolean);
}

/**
 * Об'єднуємо ланцюжок фрагментів у єдиний безперервний рядок,
 * склеюючи їх за правилом перекриття країв (перші 2 цифри наступного збігаються з останніми 2 попереднього).
 */

function mergeChainToString(chain: string[]): string {
  if (chain.length === 0) return '';

  let resultingString = chain[0] || '';

  for (let i = 1; i < chain.length; i++) {
    const fragment = chain[i];
    if (fragment) {
      // Додаємо фрагмент, відкинувши його перші 2 символи, які вже дублюють кінець попереднього
      resultingString += fragment.slice(2);
    }
  }
  return resultingString;
}

/**
 * Головна точка входу програми.
 */
function main() {
  console.log('⏳Завантаження фрагментів...');
  const fragments = loadFragmentsFromFile(FRAGMENTS_FILE_PATH);

  if (fragments.length === 0) {
    console.log('❌ Файл fragments.txt порожній або не знайдений!')
    return;
  }

  console.log(`✅ Завантажено фрагментів: ${fragments.length}`);
  console.log('🔍 Шукаємо повний ланцюжок за допомогою Ейлерова шляху...');

  const startTime = Date.now();
  const foundChain = findEulerianPath(fragments);
  const endTime = Date.now();

  const executionTimeMs = endTime - startTime;

  console.log(`🏆 Кількість елементів у знайденому ланцюжку: ${foundChain.length}`);
  console.log(`⌚ Час виконання: ${executionTimeMs} мс`);

  if (foundChain.length > 0) {
    const finalSequence = mergeChainToString(foundChain);
    console.log('\n--- ФІНАЛЬНИЙ РЕЗУЛЬТАТ ---');
    console.log(finalSequence);
    console.log('---------------------------');
    console.log(`Довжина фінального рядка: ${finalSequence.length} символів`);
  } else {
    console.log('❌ Ланцюжок не знайдено.');
  }
}

main();