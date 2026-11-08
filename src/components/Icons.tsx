function Icon({ paths }: { paths: string[] }) {
  return (
    <svg viewBox="0 0 24 24" className="ico" aria-hidden="true">
      {paths.map(d => <path key={d} d={d} />)}
    </svg>
  );
}

export const CartIcon = () => <Icon paths={["M2.5 3.5h2.7l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.1L20.5 7H6", "M9.5 20.2h.01", "M17 20.2h.01"]} />;
export const ReloadIcon = () => <Icon paths={["M20 12a8 8 0 1 1-2.4-5.7", "M20 4v5h-5"]} />;
export const PencilIcon = () => <Icon paths={["M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z", "M14 7l3 3"]} />;
export const TrashIcon = () => <Icon paths={["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12", "M9 7V4h6v3"]} />;
export const BackIcon = () => <Icon paths={["M15 5l-7 7 7 7"]} />;
