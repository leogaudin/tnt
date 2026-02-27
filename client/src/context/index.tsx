import React, { createContext, useEffect, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { callAPI, fetchInsights, user } from '../service';
import type { InsightBox } from '../types';

interface AppContextType {
	rawInsights: InsightBox[] | null;
	language: string;
	setLanguage: Dispatch<SetStateAction<string>>;
}

const AppContext = createContext<AppContextType>({
	rawInsights: null,
	language: 'en',
	setLanguage: () => { },
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
	const [language, setLanguage] = useState('en');
	const [rawInsights, setRawInsights] = useState<InsightBox[] | null>(null);

	const initTnT = async () => {
		const res = await callAPI('GET', 'auth/me')
							.then(res => res.json())
		const me = res.user;
		localStorage.setItem('user', JSON.stringify(me));
		Object.assign(user!, me);

		const rawInsights = await fetchInsights({ adminId: user!.id });
		return { rawInsights };
	}

	useEffect(() => {
		if (!user?.id) return;

		initTnT()
			.then((data) => {
				setRawInsights(data.rawInsights);
			})
			.catch((e) => {
				console.error(e);
			});
	}, []);

	return (
		<AppContext.Provider
			value={{
				rawInsights,
				language,
				setLanguage,
			}}
		>
			{children}
		</AppContext.Provider>
	);
};

export default AppContext;