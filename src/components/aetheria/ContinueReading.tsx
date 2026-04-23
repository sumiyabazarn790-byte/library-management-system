import bookRed from "@/assets/book-red.jpg";
import bookStack from "@/assets/book-stack.jpg";
import bookCandle from "@/assets/book-candle.jpg";
import bookNeural from "@/assets/book-neural.jpg";

const items = [
  { img: bookRed, title: "Beyond the Event Horizon", author: "Marcus Thorne", progress: 64 },
  { img: bookStack, title: "Echoes of Ancient Rome", author: "Dr. Elena Rossi", progress: 41 },
  { img: bookCandle, title: "The Singularity Myth", author: "Julian Vance", progress: 78 },
  { img: bookNeural, title: "Neural Architectures", author: "Sarah Chen", progress: 22 },
];

export const ContinueReading = () => {
  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <h2 className="text-headline-md">Continue Reading</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {items.map((b) => (
          <article
            key={b.title}
            className="group cursor-pointer"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg ring-hairline shadow-card transition-all duration-500 group-hover:ring-hairline-strong group-hover:shadow-cinematic group-hover:-translate-y-1">
              <img
                src={b.img}
                alt={b.title}
                loading="lazy"
                width={640}
                height={800}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-card-fade" />
              <div className="absolute inset-x-3 bottom-3">
                <div className="h-[3px] rounded-full bg-foreground/15 overflow-hidden">
                  <div
                    className="h-full bg-gradient-accent shadow-glow-primary"
                    style={{ width: `${b.progress}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 px-0.5">
              <h3 className="font-display font-semibold text-[15px] leading-tight truncate">{b.title}</h3>
              <p className="text-[13px] text-muted-foreground mt-1">{b.author}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
