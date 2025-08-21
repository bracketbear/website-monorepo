import clsx from 'clsx';

export interface TestimonialProps {
  quote: string | React.ReactNode;
  name: string;
  role?: string;
  org?: string;
  avatarUrl?: string;
  className?: string;
  variant?: 'light' | 'dark' | 'primary';
}

export const Testimonial = ({
  quote,
  name,
  role,
  org,
  avatarUrl,
  variant = 'dark',
  className,
}: TestimonialProps) => {
  const darkClass = 'bg-brand-dark text-text-primary';
  const lightClass = 'text-brand-dark bg-white';
  const textLightClass = 'text-gray-900';
  const textDarkClass = 'text-text-primary';

  return (
    <section
      className={clsx(
        'px-content relative isolate overflow-hidden py-24 sm:py-32',
        variant === 'dark' && darkClass,
        variant === 'light' && lightClass,
        variant === 'primary' && 'bg-primary/90 text-text-primary',
        className
      )}
    >
      {/* <div
        className={clsx(
          'absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] shadow-xl ring-1 sm:mr-28 lg:mr-0 xl:mr-16 xl:origin-center',
          variant === 'dark' &&
            'bg-brand-dark shadow-indigo-600/10 ring-indigo-100',
          variant === 'light' && 'bg-white shadow-indigo-600/10 ring-indigo-50'
        )}
      /> */}
      <div className="mx-auto max-w-2xl lg:max-w-4xl">
        <figure className="mt-10">
          <blockquote
            className={clsx(
              'text-center text-xl font-semibold sm:text-2xl',
              variant === 'dark' && textDarkClass,
              variant === 'light' && textLightClass
            )}
          >
            {quote}
          </blockquote>
          <figcaption className="mt-10">
            <img
              alt=""
              src={avatarUrl}
              className="mx-auto size-10 rounded-full"
            />
            <div className="mt-4 flex items-center justify-center space-x-3 text-base">
              <div
                className={clsx(
                  'font-semibold',
                  variant === 'dark' && 'text-text-primary',
                  variant === 'light' && 'text-gray-900'
                )}
              >
                {name}
                <svg
                  width={3}
                  height={3}
                  viewBox="0 0 2 2"
                  aria-hidden="true"
                  className="fill-gray-900"
                >
                  <circle r={1} cx={1} cy={1} />
                </svg>
                <div
                  className={clsx(
                    'text-gray-400',
                    variant === 'dark' && 'text-gray-200'
                  )}
                >
                  {role} {org && `at ${org}`}
                </div>
              </div>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
};
