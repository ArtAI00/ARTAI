use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token;
use mpl_token_metadata::instruction as mpl_instruction;

declare_id!("ArtAiNFTv1");

#[program]
pub mod art_ai_nft {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        collection_name: String,
        collection_symbol: String,
        collection_uri: String,
    ) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        collection.authority = ctx.accounts.authority.key();
        collection.name = collection_name;
        collection.symbol = collection_symbol;
        collection.uri = collection_uri;
        collection.total_supply = 0;
        Ok(())
    }

    pub fn mint_nft(
        ctx: Context<MintNFT>,
        name: String,
        symbol: String,
        uri: String,
        creator_share: u8,
    ) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        let mint = &ctx.accounts.mint;
        let metadata = &ctx.accounts.metadata;
        
        // Create metadata account
        let metadata_infos = vec![
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];

        let creators = vec![
            mpl_token_metadata::state::Creator {
                address: ctx.accounts.authority.key(),
                verified: true,
                share: creator_share,
            },
        ];

        invoke(
            &mpl_instruction::create_metadata_accounts_v2(
                mpl_token_metadata::ID,
                metadata.key(),
                mint.key(),
                ctx.accounts.authority.key(),
                ctx.accounts.authority.key(),
                ctx.accounts.authority.key(),
                name,
                symbol,
                uri,
                Some(creators),
                500, // Seller fee basis points (5%)
                true,
                false,
                None,
                None,
            ),
            metadata_infos.as_slice(),
        )?;

        // Mint token to receiver
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            1,
        )?;

        collection.total_supply = collection.total_supply.checked_add(1).unwrap();
        Ok(())
    }

    pub fn transfer_nft(
        ctx: Context<TransferNFT>,
    ) -> Result<()> {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.from.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            1,
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = Collection::LEN)]
    pub collection: Account<'info, Collection>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub collection: Account<'info, Collection>,
    #[account(mut)]
    pub mint: Signer<'info>,
    /// CHECK: Metadata account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    #[account(mut)]
    pub token_account: Account<'info, token::TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, token::Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct TransferNFT<'info> {
    #[account(mut)]
    pub from: Account<'info, token::TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, token::TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, token::Token>,
}

#[account]
pub struct Collection {
    pub authority: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub total_supply: u64,
}

impl Collection {
    pub const LEN: usize = 8 + // Discriminator
        32 + // Authority
        32 + // Name
        8 + // Symbol
        32 + // URI
        8; // Total supply
}