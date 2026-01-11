
export interface TransferPitch {
    player_id: any;
    id: string;
    description: string;
    asking_price: number;
    currency: string;
    transfer_type: string;
    status: string;
    created_at: string;
    expires_at: string;
    tagged_videos: string[];
    sign_on_bonus: number;
    performance_bonus: number;
    player_salary: number;
    relocation_support: number;
    loan_fee: number;
    loan_with_option: boolean;
    loan_with_obligation: boolean;
    is_international: boolean;
    service_charge_rate: number;
    team_id: string;
    team_profile_id?: string;
    deal_stage?: string;
    contract_finalized?: boolean;
    contract_finalized_at?: string;
    players: {
        id: string;
        full_name: string;
        position: string;
        citizenship: string;
        headshot_url: string;
        photo_url: string;
        jersey_number: number;
        age?: number;
        bio: string;
        market_value: number;
        height: number;
        weight: number;
    };
    teams: {
        team_name: string;
        country: string;
        logo_url: string;
        member_association: string;
    };
    tagged_video_details?: {
        id: string;
        title: string;
        thumbnail_url: string;
        duration: number;
    }[];
} 
