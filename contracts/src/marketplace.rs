use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token;

declare_id!("ArtAiMarketplacev1");

#[program]
pub mod art_ai_marketplace {
    use super::*;

    pub fn create_listing(
        ctx: Context<CreateListing>,
        price: u64,
        duration: i64,
    ) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.nft_mint = ctx.accounts.nft_mint.key();
        listing.price = price;
        listing.created_at = Clock::get()?.unix_timestamp;
        listing.expires_at = Clock::get()?.unix_timestamp + duration;
        listing.active = true;

        // Transfer NFT to escrow
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.seller_token_account.to_account_info(),
                    to: ctx.accounts.escrow_token_account.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            1,
        )?;

        Ok(())
    }

    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.active, ErrorCode::ListingNotActive);
        require!(listing.seller == ctx.accounts.seller.key(), ErrorCode::UnauthorizedAccess);

        // Return NFT to seller
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.listing.to_account_info(),
                },
            ),
            1,
        )?;

        listing.active = false;
        Ok(())
    }

    pub fn purchase(
        ctx: Context<Purchase>,
    ) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.active, ErrorCode::ListingNotActive);
        require!(Clock::get()?.unix_timestamp <= listing.expires_at, ErrorCode::ListingExpired);

        // Transfer payment
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.buyer_payment_account.to_account_info(),
                    to: ctx.accounts.seller_payment_account.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            listing.price,
        )?;

        // Transfer NFT to buyer
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.listing.to_account_info(),
                },
            ),
            1,
        )?;

        listing.active = false;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateListing<'info> {
    #[account(init, payer = seller, space = Listing::LEN)]
    pub listing: Account<'info, Listing>,
    pub nft_mint: Account<'info, token::Mint>,
    #[account(mut)]
    pub seller_token_account: Account<'info, token::TokenAccount>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, token::TokenAccount>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, token::TokenAccount>,
    #[account(mut)]
    pub seller_token_account: Account<'info, token::TokenAccount>,
    pub seller: Signer<'info>,
    pub token_program: Program<'info, token::Token>,
}

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, token::TokenAccount>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, token::TokenAccount>,
    #[account(mut)]
    pub buyer_payment_account: Account<'info, token::TokenAccount>,
    #[account(mut)]
    pub seller_payment_account: Account<'info, token::TokenAccount>,
    pub buyer: Signer<'info>,
    pub token_program: Program<'info, token::Token>,
}

#[account]
pub struct Listing {
    pub seller: Pubkey,
    pub nft_mint: Pubkey,
    pub price: u64,
    pub created_at: i64,
    pub expires_at: i64,
    pub active: bool,
}

impl Listing {
    pub const LEN: usize = 8 + // Discriminator
        32 + // Seller
        32 + // NFT mint
        8 + // Price
        8 + // Created at
        8 + // Expires at
        1; // Active
}

#[error_code]
pub enum ErrorCode {
    #[msg("Listing is not active")]
    ListingNotActive,
    #[msg("Listing has expired")]
    ListingExpired,
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
}