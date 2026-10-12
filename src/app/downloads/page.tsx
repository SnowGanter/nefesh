import { ArrowLeft, Download, Github } from 'lucide-react';

const repository = process.env.NEXT_PUBLIC_REPOSITORY || 'SnowGanter/nefesh';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function DownloadsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <a href={`${basePath}/#!/home`} className="neo-btn neo-btn-white mb-8"><ArrowLeft size={18} /> На главную</a>
      <section className="neo-card p-6 sm:p-10">
        <h1 className="text-3xl">Исходники Nefesh</h1>
        <p className="my-5">Скачайте актуальный проект целиком или откройте его на GitHub. Инструкции по запуску находятся в README.</p>
        <div className="flex flex-wrap gap-4">
          <a className="neo-btn neo-btn-lime" href={`https://github.com/${repository}/archive/refs/heads/main.zip`}><Download size={18} /> Скачать ZIP</a>
          <a className="neo-btn neo-btn-yellow" href={`https://github.com/${repository}`} target="_blank" rel="noopener noreferrer"><Github size={18} /> Репозиторий</a>
        </div>
      </section>
    </main>
  );
}
