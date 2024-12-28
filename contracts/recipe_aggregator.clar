;; Recipe Aggregator Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-not-found (err u404))
(define-constant err-unauthorized (err u401))
(define-constant err-already-exists (err u409))

;; Data Variables
(define-data-var next-recipe-id uint u0)

;; Define recipe data structure
(define-map recipes
    uint 
    {
        owner: principal,
        name: (string-ascii 50),
        ingredients: (list 20 (string-ascii 30)),
        dietary-tags: (list 5 (string-ascii 20)),
        rating: uint,
        ratings-count: uint
    }
)

;; Define user ratings map
(define-map user-ratings
    {recipe-id: uint, user: principal}
    uint
)

;; Public functions

;; Add new recipe
(define-public (add-recipe 
    (name (string-ascii 50))
    (ingredients (list 20 (string-ascii 30)))
    (dietary-tags (list 5 (string-ascii 20))))
    (let
        ((recipe-id (var-get next-recipe-id)))
        (map-set recipes recipe-id {
            owner: tx-sender,
            name: name,
            ingredients: ingredients,
            dietary-tags: dietary-tags,
            rating: u0,
            ratings-count: u0
        })
        (var-set next-recipe-id (+ recipe-id u1))
        (ok recipe-id)
    )
)

;; Rate a recipe
(define-public (rate-recipe (recipe-id uint) (rating uint))
    (let
        ((current-recipe (unwrap! (map-get? recipes recipe-id) err-not-found))
         (previous-rating (default-to u0 (map-get? user-ratings {recipe-id: recipe-id, user: tx-sender}))))
        
        ;; Update user rating
        (map-set user-ratings {recipe-id: recipe-id, user: tx-sender} rating)
        
        ;; Update recipe rating
        (map-set recipes recipe-id
            (merge current-recipe {
                rating: (+ (get rating current-recipe) rating),
                ratings-count: (+ (get ratings-count current-recipe) u1)
            })
        )
        (ok true)
    )
)

;; Read-only functions

;; Get recipe details
(define-read-only (get-recipe (recipe-id uint))
    (ok (map-get? recipes recipe-id))
)

;; Get recipe rating
(define-read-only (get-recipe-rating (recipe-id uint))
    (let
        ((recipe (unwrap! (map-get? recipes recipe-id) err-not-found)))
        (ok (tuple (rating (get rating recipe)) (count (get ratings-count recipe))))
    )
)

;; Check if recipe contains ingredient
(define-read-only (recipe-has-ingredient (recipe-id uint) (ingredient (string-ascii 30)))
    (let
        ((recipe (unwrap! (map-get? recipes recipe-id) err-not-found)))
        (ok (includes? (get ingredients recipe) ingredient))
    )
)

;; Get all recipes with dietary tag
(define-read-only (get-recipes-by-tag (dietary-tag (string-ascii 20)))
    (let
        ((recipe-count (var-get next-recipe-id)))
        (filter tag-matcher (list recipe-count))
    )
)

(define-private (tag-matcher (recipe-id uint))
    (let
        ((recipe (unwrap! (map-get? recipes recipe-id) false)))
        (includes? (get dietary-tags recipe) dietary-tag)
    )
)