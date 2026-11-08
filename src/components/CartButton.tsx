import { useApp } from "../AppContext";
import type { Recipe } from "../types";
import { CartIcon } from "./Icons";

export function CartButton({ r }: { r: Recipe }) {
  const { openCart } = useApp();
  return (
    <button className="icon-btn cart" type="button" aria-label={"Ajouter « " + r.name + " » au panier"} title="Ajouter au panier"
      onClick={e => { e.stopPropagation(); openCart(r); }}>
      <CartIcon />
    </button>
  );
}
