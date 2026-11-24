-- Le nom d'affichage par défaut passe de « Ma boutique » à « MEËRA KINKS ».
-- On ne touche que les bases qui portent encore l'ancien nom par défaut : un nom choisi par la vendeuse est conservé.
UPDATE "StoreSettings" SET "storeName" = 'MEËRA KINKS' WHERE "storeName" = 'Ma boutique';
