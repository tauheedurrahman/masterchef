-- Categories carry no emoji.
--
-- The previous migration seeded an icon per category and the dashboard let you
-- set one. Both are gone: the admin form no longer offers the field and the
-- cards no longer render it, so these values were left over with nothing
-- reading them.
--
-- The column itself stays. It is nullable and now always null, which keeps this
-- reversible — putting icons back is a UI change, not another schema change.

UPDATE categories SET icon = NULL WHERE icon IS NOT NULL;
