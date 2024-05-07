package com.oracle.coherence.idrs;

import java.io.DataInput;
import java.io.DataOutput;
import java.io.IOException;
import java.util.Arrays;
import java.util.Objects;

import com.tangosol.internal.net.topic.impl.paged.model.PagedPosition;
import com.tangosol.internal.net.topic.impl.paged.model.SubscriberId;
import com.tangosol.io.ExternalizableLite;
import com.tangosol.util.ExternalizableHelper;

public class ChannelPosition
        implements ExternalizableLite
    {
    public ChannelPosition()
        {
        }

    public ChannelPosition(int nChannel, PagedPosition position, SubscriberId subscriberId, int[] anChannel)
        {
        m_nChannel     = nChannel;
        m_position     = position;
        m_subscriberId = subscriberId;
        m_anChannel    = anChannel;
        }

    public int getChannel()
        {
        return m_nChannel;
        }

    public PagedPosition getPosition()
        {
        return m_position;
        }

    @Override
    public void readExternal(DataInput in) throws IOException
        {
        m_nChannel     = in.readInt();
        m_position     = ExternalizableHelper.readObject(in);
        m_subscriberId = ExternalizableHelper.readObject(in);
        int c = in.readInt();
        m_anChannel = new int[c];
        for (int i = 0; i < c; i++)
            {
            m_anChannel[i] = in.readInt();
            }
        }

    @Override
    public void writeExternal(DataOutput out) throws IOException
        {
        out.writeInt(m_nChannel);
        ExternalizableHelper.writeObject(out, m_position);
        ExternalizableHelper.writeObject(out, m_subscriberId);
        out.writeInt(m_anChannel.length);
        for (int i : m_anChannel)
            {
            out.writeInt(i);
            }
        }

    @Override
    public boolean equals(Object o)
        {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ChannelPosition that = (ChannelPosition) o;
        return m_nChannel == that.m_nChannel && Objects.equals(m_position, that.m_position);
        }

    @Override
    public int hashCode()
        {
        return Objects.hash(m_nChannel, m_position);
        }

    @Override
    public String toString()
        {
        return "ChannelPosition{" +
                "channel=" + m_nChannel +
                ", position=" + m_position +
                ", subscriber=" + m_subscriberId +
                ", channels=" + Arrays.toString(m_anChannel) +
                '}';
        }

    // ----- data members ---------------------------------------------------

    private int m_nChannel;

    private PagedPosition m_position;

    private SubscriberId m_subscriberId;

    private int[] m_anChannel;
    }
